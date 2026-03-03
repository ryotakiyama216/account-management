import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { searchServiceNameFromDify } from "@/lib/dify";
import { findCredentialByService } from "@/lib/store";

type QueryRequest = {
  query?: string;
};

function extractServiceNameFallback(query: string): string {
  return query
    .replace(/(のログイン情報|ログイン情報|を出して|教えて|出して)/g, "")
    .trim();
}

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as QueryRequest;
    if (!body.query) {
      return Response.json(
        { error: "query is required." },
        { status: 400 }
      );
    }

    const fromDify = await searchServiceNameFromDify({
      userId,
      query: body.query
    });
    const targetService = fromDify ?? extractServiceNameFallback(body.query);

    if (!targetService) {
      return Response.json(
        { error: "Could not identify target service." },
        { status: 422 }
      );
    }

    const record = await findCredentialByService(userId, targetService);
    if (!record) {
      return Response.json(
        { error: `${targetService} was not found.` },
        { status: 404 }
      );
    }

    const password = decryptSecret(
      record.passwordCipher,
      record.passwordIv,
      record.passwordAuthTag
    );

    return Response.json({
      id: record.id,
      serviceName: record.serviceName,
      loginId: record.loginId,
      password,
      notes: record.notes ?? ""
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
