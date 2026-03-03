import fs from "node:fs/promises";
import path from "node:path";

import type { CredentialRecord, CredentialStore } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "credentials.json");

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial: CredentialStore = { credentials: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readStore(): Promise<CredentialStore> {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(raw) as CredentialStore;
}

export async function writeStore(store: CredentialStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function createCredentialRecord(
  record: CredentialRecord
): Promise<void> {
  const store = await readStore();
  store.credentials.push(record);
  await writeStore(store);
}

export async function findCredentialByService(
  userId: string,
  serviceName: string
): Promise<CredentialRecord | null> {
  const store = await readStore();
  const normalized = serviceName.trim().toLowerCase();

  return (
    store.credentials
      .filter((c) => c.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .find((c) => c.serviceName.toLowerCase() === normalized) ?? null
  );
}

export async function updateCredentialRecordById(input: {
  id: string;
  userId: string;
  serviceName: string;
  loginId: string;
  passwordCipher: string;
  passwordIv: string;
  passwordAuthTag: string;
  notes?: string;
}): Promise<CredentialRecord | null> {
  const store = await readStore();
  const index = store.credentials.findIndex(
    (c) => c.id === input.id && c.userId === input.userId
  );

  if (index === -1) {
    return null;
  }

  const current = store.credentials[index];
  const updated: CredentialRecord = {
    ...current,
    serviceName: input.serviceName,
    loginId: input.loginId,
    passwordCipher: input.passwordCipher,
    passwordIv: input.passwordIv,
    passwordAuthTag: input.passwordAuthTag,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  };

  store.credentials[index] = updated;
  await writeStore(store);
  return updated;
}
