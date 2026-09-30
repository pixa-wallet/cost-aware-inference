import { env } from "./env.js";
import { listCatalog } from "./catalog.js";
import { FIXED_OFFERINGS } from "./offerings.js";

const RESPONSE_HEADERS = [
  {
    name: "x-routify-requested-model",
    description: "Logical model id requested by the client, or auto when omitted.",
  },
  {
    name: "x-routify-tier",
    description: "Logical pricing and quality tier for the selected model.",
  },
  {
    name: "x-routify-price-usdc",
    description: "USDC amount charged for the router request.",
  },
] as const;

function publicCatalog() {
  return listCatalog(env.OPENROUTER_MODEL_OVERRIDE).map((model) => ({
    id: model.id,
    provider: model.provider,
    displayName: model.displayName,
    description: model.description,
    recommendedFor: model.recommendedFor,
    selectionHint: model.selectionHint,
    capabilities: model.capabilities,
    speed: model.speed,
    cost: model.cost,
    availability: model.availability,
    tier: model.tier,
    priceUsd: model.priceUsd,
    priceUsdc: model.priceUsdc,
  }));
}

export function buildDiscoveryManifest() {
  return {
    object: "service",
    service: "inference-gateway",
    version: "0.1.0",
    description:
      "Cost-aware LLM routing and AI task assistance for Hermes and other agents. Clients can discover prices, inspect x402 payment rules, and submit chat completion requests.",
    timestamp: new Date().toISOString(),
    upstream: { routing: "Managed by the gateway." },
    payment: {
      protocol: "x402-v2",
      network: env.X402_NETWORK,
      caip2: env.x402NetworkCaip2,
      facilitatorUrl: env.X402_FACILITATOR_URL,
      payTo: env.X402_PAY_TO,
      asset: {
        id: env.X402_ASSET_ID,
        symbol: env.X402_ASSET_SYMBOL,
        decimals: env.X402_ASSET_DECIMALS,
      },
      pricingStrategy: "The router costs $0.02 USDC per request.",
      challengeTag: env.X402_CHALLENGE_TAG,
      bazaarDiscovery: true,
      bypass: env.X402_API_BYPASS_KEY.trim()
        ? {
            enabled: true,
            header: "x-api-key",
            description: "If this header matches the configured bypass key, x402 payment is skipped.",
          }
        : {
            enabled: false,
          },
    },
    endpoints: [
      {
        method: "GET",
        path: "/",
        description: "Service discovery manifest for machine and frontend clients.",
      },
      {
        method: "GET",
        path: "/health",
        description: "Basic runtime health, routing mode, and x402 network configuration.",
      },
      {
        method: "GET",
        path: "/v1/models",
        description: "Logical routing options and the $0.02 USDC router price.",
      },
      {
        method: "POST",
        path: "/v1/chat/completions",
        description:
          "Routes a chat request and returns an OpenAI-compatible completion for $0.02 USDC.",
        priceUsdc: "0.02",
        contentType: "application/json",
        paymentRequired: true,
      },
      ...FIXED_OFFERINGS.map((offering) => ({
        method: "POST",
        path: offering.path,
        description: offering.description,
        priceUsdc: offering.priceUsdc,
        contentType: "application/json",
        paymentRequired: true,
      })),
    ],
    requestContract: {
      route: "POST /v1/chat/completions",
      bodyFormat: "OpenAI-compatible chat completion payload",
      requiredFields: ["messages"],
      optionalFields: [
        "model",
        "stream",
        "max_tokens",
        "max_completion_tokens",
        "temperature",
        "top_p",
        "response_format",
        "tools",
        "tool_choice",
        "metadata",
        "user",
      ],
      defaults: {
        model: "auto",
        stream: false,
      },
      modelSelection: {
        automatic: "If model is omitted, the gateway uses the logical model id 'auto'.",
        explicit: "If model is provided, it must match one of the ids from GET /v1/models.",
      },
      example: {
        model: "auto",
        messages: [
          {
            role: "user",
            content: "Write a short paragraph about why Algorand is good for micropayments.",
          },
        ],
        stream: false,
      },
    },
    responseContract: {
      successModes: ["JSON", "streaming"],
      responseHeaders: RESPONSE_HEADERS,
    },
    mainnetReady: {
      networkSwitch: "Set X402_NETWORK=mainnet; USDC changes automatically to ASA 31566704.",
      testModeAllowed: env.X402_NETWORK === "testnet",
    },
    models: publicCatalog(),
    fixedOfferings: FIXED_OFFERINGS.map(({ model, ...offering }) => offering),
  };
}

export function buildModelsResponse() {
  return {
    object: "list",
    meta: {
      service: "inference-gateway",
      description:
        "Logical routing options for the $0.02 USDC chat router. Clients can send a selected id in the model field when calling POST /v1/chat/completions.",
      defaultModel: "auto",
      routing: { managed: true },
      payment: {
        currency: "USDC",
        network: env.X402_NETWORK,
        assetId: env.X402_ASSET_ID,
        assetSymbol: env.X402_ASSET_SYMBOL,
        pricingNote: "Every router request costs $0.02 USDC.",
      },
    },
    data: publicCatalog(),
  };
}
