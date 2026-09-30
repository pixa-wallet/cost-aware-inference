import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1),
}).passthrough();

export const ChatCompletionRequestSchema = z.object({
  model: z.string().optional().default("auto"),
  messages: z.array(ChatMessageSchema).min(1),
  stream: z.boolean().optional().default(false),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  response_format: z.unknown().optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  user: z.string().optional(),
}).passthrough();

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

export function getRequestedModelId(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("model" in body)) return undefined;
  const value = Reflect.get(body, "model");
  return typeof value === "string" ? value : undefined;
}
