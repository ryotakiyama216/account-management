type DifyDocument = {
  name: string;
  text: string;
  indexing_technique?: "high_quality" | "economy";
  process_rule?: {
    mode: "automatic";
  };
};

function getDifyConfig() {
  const baseUrl = process.env.DIFY_BASE_URL;
  const datasetId = process.env.DIFY_DATASET_ID;
  const apiKey = process.env.DIFY_API_KEY;

  return { baseUrl, datasetId, apiKey };
}

export async function upsertCredentialMetadataToDify(input: {
  userId: string;
  serviceName: string;
  loginId: string;
  notes?: string;
}): Promise<void> {
  const { baseUrl, datasetId, apiKey } = getDifyConfig();
  if (!baseUrl || !datasetId || !apiKey) {
    return;
  }

  const doc: DifyDocument = {
    name: `${input.userId}-${input.serviceName}`,
    text: `user:${input.userId}\nservice:${input.serviceName}\nloginId:${input.loginId}\nnotes:${input.notes ?? ""}`,
    indexing_technique: "high_quality",
    process_rule: { mode: "automatic" }
  };

  await fetch(`${baseUrl}/v1/datasets/${datasetId}/document/create_by_text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(doc),
    cache: "no-store"
  });
}

export async function searchServiceNameFromDify(input: {
  query: string;
  userId: string;
}): Promise<string | null> {
  const { baseUrl, apiKey } = getDifyConfig();
  const appId = process.env.DIFY_CHAT_APP_ID;

  if (!baseUrl || !apiKey || !appId) {
    return null;
  }

  const response = await fetch(`${baseUrl}/v1/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      app_id: appId,
      inputs: {
        userId: input.userId
      },
      query: input.query,
      response_mode: "blocking",
      user: input.userId
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { answer?: string };
  if (!json.answer) {
    return null;
  }

  return json.answer.trim() || null;
}
