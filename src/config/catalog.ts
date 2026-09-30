export type ModelSpeed = "fast" | "balanced" | "slow";
export type ModelCost = "low" | "medium" | "high";
export type ModelAvailability = "available" | "degraded" | "unavailable";
export type ModelTier = "open-source" | "fast" | "balanced" | "premium";

export interface CatalogModel {
  id: string;
  provider: string;
  displayName: string;
  description: string;
  recommendedFor: string[];
  selectionHint: string;
  capabilities: string[];
  speed: ModelSpeed;
  cost: ModelCost;
  availability: ModelAvailability;
  tier: ModelTier;
  intendedUpstreamModel: string;
  priceUsd: string;
  priceUsdc: string;
}

export interface ResolvedCatalogModel extends CatalogModel {
  resolvedUpstreamModel: string;
}

export const ROUTER_PRICE_USD = "$0.02";
export const ROUTER_PRICE_USDC = "0.02";

const AUTO_MODEL: CatalogModel = {
  id: "auto",
  provider: "Cost-Aware Inference",
  displayName: "Automatic",
  description: "Uses the gateway default routing mode when the user does not explicitly pick a model.",
  recommendedFor: ["General prompts", "Users who do not want to choose manually", "Default app flows"],
  selectionHint: "Use this when the user does not care about provider choice and wants the gateway default.",
  capabilities: ["Planning", "Writing", "Research", "Tools"],
  speed: "balanced",
  cost: "medium",
  availability: "available",
  tier: "balanced",
  intendedUpstreamModel: "openrouter/auto",
  priceUsd: ROUTER_PRICE_USD,
  priceUsdc: ROUTER_PRICE_USDC,
};

const EXPLICIT_MODELS: CatalogModel[] = [
  {
    id: "openai/gpt-5.6-luna",
    provider: "OpenAI",
    displayName: "GPT-5.6 Luna",
    description: "Fast OpenAI option for short writing, summaries, and lighter prompt work.",
    recommendedFor: ["Short prompts", "Summaries", "Fast UI interactions"],
    selectionHint: "Pick this when latency matters more than depth.",
    capabilities: ["Writing", "Chat", "Reasoning"],
    speed: "fast",
    cost: "low",
    availability: "available",
    tier: "fast",
    intendedUpstreamModel: "openai/gpt-5.6-luna",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "openai/gpt-5.6-terra",
    provider: "OpenAI",
    displayName: "GPT-5.6 Terra",
    description: "Balanced OpenAI option for everyday reasoning, coding, and agent tasks.",
    recommendedFor: ["General reasoning", "Coding", "Agent flows"],
    selectionHint: "Pick this as the balanced OpenAI default.",
    capabilities: ["Writing", "Reasoning", "Coding", "Tools"],
    speed: "balanced",
    cost: "medium",
    availability: "available",
    tier: "balanced",
    intendedUpstreamModel: "openai/gpt-5.6-terra",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "openai/gpt-5.6-sol",
    provider: "OpenAI",
    displayName: "GPT-5.6 Sol",
    description: "Premium OpenAI option for harder reasoning, coding, and long-horizon tasks.",
    recommendedFor: ["Hard reasoning", "Complex coding", "Long multi-step tasks"],
    selectionHint: "Pick this when quality matters more than price and speed.",
    capabilities: ["Writing", "Reasoning", "Coding", "Tools"],
    speed: "slow",
    cost: "high",
    availability: "available",
    tier: "premium",
    intendedUpstreamModel: "openai/gpt-5.6-sol",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "anthropic/claude-haiku-4.5",
    provider: "Anthropic",
    displayName: "Claude Haiku 4.5",
    description: "Fast Claude option with strong responsiveness for high-volume work.",
    recommendedFor: ["Fast drafting", "High request volume", "Simple assistants"],
    selectionHint: "Pick this for cheaper fast Claude-style responses.",
    capabilities: ["Writing", "Reasoning", "Tools"],
    speed: "fast",
    cost: "low",
    availability: "available",
    tier: "fast",
    intendedUpstreamModel: "anthropic/claude-haiku-4.5",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    provider: "Anthropic",
    displayName: "Claude Sonnet 4.6",
    description: "Balanced Claude option for strong coding, document work, and agents.",
    recommendedFor: ["Coding", "Document work", "Balanced agent tasks"],
    selectionHint: "Pick this as the balanced Claude default.",
    capabilities: ["Writing", "Reasoning", "Coding", "Tools"],
    speed: "balanced",
    cost: "medium",
    availability: "available",
    tier: "balanced",
    intendedUpstreamModel: "anthropic/claude-sonnet-4.6",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "anthropic/claude-opus-4.7",
    provider: "Anthropic",
    displayName: "Claude Opus 4.7",
    description: "Premium Claude option for persistent, complex, multi-step work.",
    recommendedFor: ["Deep analysis", "Complex workflows", "Long task chains"],
    selectionHint: "Pick this for the strongest Claude-tier reasoning.",
    capabilities: ["Writing", "Reasoning", "Coding", "Tools"],
    speed: "slow",
    cost: "high",
    availability: "available",
    tier: "premium",
    intendedUpstreamModel: "anthropic/claude-opus-4.7",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    provider: "Meta",
    displayName: "Llama 3.3 70B Instruct",
    description: "Strong open-source general-purpose text model.",
    recommendedFor: ["General chat", "Budget-conscious prompts", "Open-source preference"],
    selectionHint: "Pick this when you want a strong open-source default.",
    capabilities: ["Writing", "Reasoning", "Chat"],
    speed: "balanced",
    cost: "low",
    availability: "available",
    tier: "open-source",
    intendedUpstreamModel: "meta-llama/llama-3.3-70b-instruct",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "mistralai/mistral-small-24b-instruct-2501",
    provider: "Mistral",
    displayName: "Mistral Small 3",
    description: "Low-cost open-source model for lightweight text generation and chat.",
    recommendedFor: ["Lightweight prompts", "Simple chat", "Lowest-cost explicit pick"],
    selectionHint: "Pick this for cheap lightweight prompt handling.",
    capabilities: ["Writing", "Chat"],
    speed: "fast",
    cost: "low",
    availability: "available",
    tier: "open-source",
    intendedUpstreamModel: "mistralai/mistral-small-24b-instruct-2501",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "google/gemma-3-27b-it",
    provider: "Google",
    displayName: "Gemma 3 27B",
    description: "Open-source Google model for general reasoning and multimodal-friendly workflows.",
    recommendedFor: ["General reasoning", "Open-source Google-style flows", "Tool-friendly tasks"],
    selectionHint: "Pick this when you want open-source reasoning with a Google-family slot.",
    capabilities: ["Writing", "Reasoning", "Tools"],
    speed: "balanced",
    cost: "low",
    availability: "available",
    tier: "open-source",
    intendedUpstreamModel: "google/gemma-3-27b-it",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
  {
    id: "google/gemini-2.5-flash",
    provider: "Google",
    displayName: "Gemini 2.5 Flash",
    description: "Fast practical multimodal workhorse for general prompts and tool-heavy tasks.",
    recommendedFor: ["Fast general use", "Tool-heavy flows", "Everyday prompts"],
    selectionHint: "Pick this for a fast Google-family general model.",
    capabilities: ["Writing", "Reasoning", "Coding", "Tools"],
    speed: "fast",
    cost: "low",
    availability: "available",
    tier: "fast",
    intendedUpstreamModel: "google/gemini-2.5-flash",
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  },
];

const MODELS = [AUTO_MODEL, ...EXPLICIT_MODELS] as const;

export function listCatalog(modelOverride: string): ResolvedCatalogModel[] {
  return MODELS.map((model) => ({
    ...model,
    resolvedUpstreamModel: resolveUpstreamModel(model, modelOverride),
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  }));
}

export function findCatalogModel(modelId: string | undefined): CatalogModel | undefined {
  const id = modelId?.trim() || "auto";
  return MODELS.find((model) => model.id === id);
}

export function isAllowedModelId(modelId: string | undefined): boolean {
  return Boolean(findCatalogModel(modelId));
}

export function resolveModel(modelId: string | undefined, modelOverride: string): ResolvedCatalogModel {
  const selected = findCatalogModel(modelId) ?? AUTO_MODEL;
  return {
    ...selected,
    resolvedUpstreamModel: resolveUpstreamModel(selected, modelOverride),
    priceUsd: ROUTER_PRICE_USD,
    priceUsdc: ROUTER_PRICE_USDC,
  };
}

export function priceForModel(_modelId: string | undefined): string {
  return ROUTER_PRICE_USD;
}

function resolveUpstreamModel(model: CatalogModel, modelOverride: string): string {
  return modelOverride.trim() ? modelOverride.trim() : model.intendedUpstreamModel;
}
