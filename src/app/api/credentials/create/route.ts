import crypto from "node:crypto";

import { auth } from "@/auth";
import { encryptSecret } from "@/lib/crypto";
import { upsertCredentialMetadataToDify } from "@/lib/dify";
import { createCredentialRecord } from "@/lib/store";

type CreateCredentialRequest = {
  serviceName?: string;
  loginId?: string;
  password?: string;
  notes?: string;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as CreateCredentialRequest;

    if (!body.serviceName || !body.loginId || !body.password) {
      return Response.json(
        { error: "serviceName, loginId, password are required." },
        { status: 400 }
      );
    }

    const encrypted = encryptSecret(body.password);
    const now = new Date().toISOString();

    await createCredentialRecord({
      id: crypto.randomUUID(),
      userId,
      serviceName: body.serviceName.trim(),
      loginId: body.loginId.trim(),
      passwordCipher: encrypted.cipherText,
      passwordIv: encrypted.iv,
      passwordAuthTag: encrypted.authTag,
      notes: body.notes?.trim(),
      createdAt: now,
      updatedAt: now
    });

    await upsertCredentialMetadataToDify({
      userId,
      serviceName: body.serviceName.trim(),
      loginId: body.loginId.trim(),
      notes: body.notes?.trim()
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
