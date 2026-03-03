"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type QueryResponse = {
  id: string;
  serviceName: string;
  loginId: string;
  password: string;
  notes: string;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [serviceName, setServiceName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [registerResult, setRegisterResult] = useState("");

  const [query, setQuery] = useState("");
  const [chatResult, setChatResult] = useState<QueryResponse | null>(null);
  const [chatError, setChatError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [editServiceName, setEditServiceName] = useState("");
  const [editLoginId, setEditLoginId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const maskedPassword = useMemo(() => {
    if (!chatResult?.password) {
      return "";
    }
    if (chatResult.password.length <= 2) {
      return "*".repeat(chatResult.password.length);
    }
    return `${chatResult.password[0]}${"*".repeat(chatResult.password.length - 2)}${chatResult.password.at(-1)}`;
  }, [chatResult]);

  useEffect(() => {
    if (!chatResult) {
      return;
    }
    setEditServiceName(chatResult.serviceName);
    setEditLoginId(chatResult.loginId);
    setEditPassword(chatResult.password);
    setEditNotes(chatResult.notes);
    setUpdateStatus("");
  }, [chatResult]);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setRegisterResult("");
    try {
      const response = await fetch("/api/credentials/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName, loginId, password, notes })
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setRegisterResult(`Error: ${json.error ?? "failed"}`);
        return;
      }

      setRegisterResult("Saved");
      setServiceName("");
      setLoginId("");
      setPassword("");
      setNotes("");
    } catch {
      setRegisterResult("Error: network");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSearching(true);
    setChatError("");
    setChatResult(null);
    setCopyStatus("");
    setUpdateStatus("");
    try {
      const response = await fetch("/api/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      const json = (await response.json()) as QueryResponse & { error?: string };
      if (!response.ok) {
        setChatError(json.error ?? "failed");
        return;
      }

      setChatResult(json);
    } catch {
      setChatError("network error");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCopyResult() {
    if (!chatResult) {
      return;
    }

    const text = [
      `service: ${chatResult.serviceName}`,
      `login id: ${chatResult.loginId}`,
      `password: ${chatResult.password}`,
      `notes: ${chatResult.notes || "-"}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
      setTimeout(() => setCopyStatus(""), 1500);
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  async function handleUpdateResult(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chatResult) {
      return;
    }

    setIsUpdating(true);
    setUpdateStatus("");
    try {
      const response = await fetch("/api/credentials/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chatResult.id,
          serviceName: editServiceName,
          loginId: editLoginId,
          password: editPassword,
          notes: editNotes
        })
      });

      const json = (await response.json()) as QueryResponse & { error?: string };
      if (!response.ok) {
        setUpdateStatus(`Error: ${json.error ?? "failed"}`);
        return;
      }

      setChatResult(json);
      setUpdateStatus("Updated");
    } catch {
      setUpdateStatus("Error: network");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Password Management RAG</p>
        <h1>Secure Login Vault</h1>
        <div className="hero-actions">
          <span className="subtitle">
            {status === "loading" ? "Loading..." : session?.user?.email}
          </span>
          <button
            type="button"
            className="logout-btn"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>Save</h2>
          <form onSubmit={handleRegister}>
            <label htmlFor="serviceName">Service</label>
            <input
              id="serviceName"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="Amazon"
              autoComplete="organization"
              required
            />

            <label htmlFor="loginId">Login ID</label>
            <input
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="name@example.com"
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional"
              rows={3}
            />

            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </button>
          </form>
          {registerResult ? (
            <div className="result result-muted">{registerResult}</div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Find</h2>
          <form onSubmit={handleQuery}>
            <label htmlFor="query">Query</label>
            <input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Amazonのログイン情報を出して"
              required
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </button>
          </form>

          {chatError ? (
            <div className="result result-error">error: {chatError}</div>
          ) : null}
          {chatResult ? (
            <div className="result">
              <form onSubmit={handleUpdateResult} className="edit-form">
                <label htmlFor="edit-service">Service</label>
                <input
                  id="edit-service"
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  required
                />

                <label htmlFor="edit-login-id">Login ID</label>
                <input
                  id="edit-login-id"
                  value={editLoginId}
                  onChange={(e) => setEditLoginId(e.target.value)}
                  required
                />

                <label htmlFor="edit-password">
                  Password <span className="hint">(display: {maskedPassword})</span>
                </label>
                <input
                  id="edit-password"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  required
                />

                <label htmlFor="edit-notes">Notes</label>
                <textarea
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                />

                <button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update"}
                </button>
              </form>
              <div className="result-actions">
                <button type="button" onClick={handleCopyResult} className="copy-btn">
                  Copy
                </button>
                {copyStatus ? <span className="copy-status">{copyStatus}</span> : null}
                {updateStatus ? (
                  <span
                    className={updateStatus.startsWith("Error") ? "copy-error" : "copy-status"}
                  >
                    {updateStatus}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
