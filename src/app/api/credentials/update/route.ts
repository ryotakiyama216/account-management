import { auth } from "@/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { upsertCredentialMetadataToDify } from "@/lib/dify";
import { updateCredentialRecordById } from "@/lib/store";

type UpdateCredentialRequest = {
  id?: string;
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

    const body = (await req.json()) as UpdateCredentialRequest;

    if (!body.id || !body.serviceName || !body.loginId || !body.password) {
      return Response.json(
        {
          error: "id, serviceName, loginId, password are required for update."
        },
        { status: 400 }
      );
    }

    const encrypted = encryptSecret(body.password);
    const updated = await updateCredentialRecordById({
      id: body.id.trim(),
      userId,
      serviceName: body.serviceName.trim(),
      loginId: body.loginId.trim(),
      passwordCipher: encrypted.cipherText,
      passwordIv: encrypted.iv,
      passwordAuthTag: encrypted.authTag,
      notes: body.notes?.trim()
    });

    if (!updated) {
      return Response.json({ error: "Credential not found." }, { status: 404 });
    }

    await upsertCredentialMetadataToDify({
      userId: updated.userId,
      serviceName: updated.serviceName,
      loginId: updated.loginId,
      notes: updated.notes
    });

    const plainPassword = decryptSecret(
      updated.passwordCipher,
      updated.passwordIv,
      updated.passwordAuthTag
    );

    return Response.json({
      id: updated.id,
      serviceName: updated.serviceName,
      loginId: updated.loginId,
      password: plainPassword,
      notes: updated.notes ?? ""
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
