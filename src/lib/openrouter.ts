import { env } from "../config/env.js";
import type { ChatCompletionRequest } from "../schemas/chat.js";

export async function createOpenRouterChatCompletion(
  request: ChatCompletionRequest,
  resolvedUpstreamModel: string,
): Promise<Response> {
  const upstreamPayload = {
    ...request,
    model: resolvedUpstreamModel,
  };

  return fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamPayload),
    signal: AbortSignal.timeout(90_000),
  });
}
