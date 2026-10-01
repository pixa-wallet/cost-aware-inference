import express, { type Request, type Response } from "express";
import { paymentMiddlewareFromHTTPServer, x402ResourceServer, x402HTTPResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402/extensions/bazaar";
import { ChatCompletionRequestSchema, getRequestedModelId } from "./schemas/chat.js";
import { env } from "./config/env.js";
import { isAllowedModelId, resolveModel, ROUTER_PRICE_USD } from "./config/catalog.js";
import { buildDiscoveryManifest, buildModelsResponse } from "./config/discovery.js";
import { FREE_TIER, GOAL_BASED_TASK, MINOR_CODING_TASK, type FixedOffering } from "./config/offerings.js";
import { createOpenRouterChatCompletion } from "./lib/openrouter.js";
import { forwardUpstreamHeaders, pipeUpstreamResponse, publicCompletionBody } from "./lib/http.js";
import { sendCodingFallback } from "./lib/coding-fallback.js";

const facilitatorClient = new HTTPFacilitatorClient({
  url: env.X402_FACILITATOR_URL,
});

const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register("algorand:*", new ExactAvmScheme());
resourceServer.registerExtension(bazaarResourceServerExtension);

const chatDiscovery = declareDiscoveryExtension({
  bodyType: "json",
  input: {
    model: "auto",
    messages: [{ role: "user", content: "Explain Algorand micropayments in one paragraph." }],
    stream: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
        description: "Logical model id from GET /v1/models; defaults to auto.",
      },
      messages: {
        type: "array",
        minItems: 1,
        description: "OpenAI-compatible chat messages.",
        items: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["system", "user", "assistant", "tool"] },
            content: {},
          },
          required: ["role", "content"],
        },
      },
      stream: { type: "boolean", default: false },
    },
    required: ["messages"],
  },
  output: {
    example: {
      id: "chatcmpl_example",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content: "..." } }],
    },
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        object: { type: "string" },
        choices: { type: "array" },
      },
      required: ["id", "object", "choices"],
    },
  },
});

function fixedDiscovery(offering: FixedOffering) {
  return declareDiscoveryExtension({
    bodyType: "json",
    input: {
      messages: [{ role: "user", content: `Help me with a ${offering.displayName.toLowerCase()} request.` }],
      stream: false,
    },
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          minItems: 1,
          description: "OpenAI-compatible chat messages. The gateway handles the request.",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["system", "user", "assistant", "tool"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
        stream: { type: "boolean", default: false },
      },
      required: ["messages"],
    },
    output: {
      example: {
        id: "chatcmpl_example",
        object: "chat.completion",
        choices: [{ index: 0, message: { role: "assistant", content: "..." } }],
      },
      schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          object: { type: "string" },
          choices: { type: "array" },
        },
        required: ["id", "object", "choices"],
      },
    },
  });
}

function fixedPaymentRoute(offering: FixedOffering) {
  return {
    accepts: {
      scheme: "exact" as const,
      network: env.x402NetworkCaip2,
      payTo: env.X402_PAY_TO,
      price: offering.priceUsd,
      maxTimeoutSeconds: env.X402_TIMEOUT_SECONDS,
      extra: {
        name: env.X402_ASSET_SYMBOL,
        decimals: env.X402_ASSET_DECIMALS,
        tag: env.X402_CHALLENGE_TAG,
      },
    },
    description: `${offering.description} Fixed price: ${offering.priceUsd} USDC per request.`,
    mimeType: "application/json",
    serviceName: offering.displayName,
    tags: [env.X402_CHALLENGE_TAG, "ai", "inference", offering.id],
    ...(env.X402_ICON_URL ? { iconUrl: env.X402_ICON_URL } : {}),
    extensions: fixedDiscovery(offering),
  };
}

const routes = {
  "POST /v1/chat/completions": {
    accepts: {
      scheme: "exact",
      network: env.x402NetworkCaip2,
      payTo: env.X402_PAY_TO,
      price: ROUTER_PRICE_USD,
      maxTimeoutSeconds: env.X402_TIMEOUT_SECONDS,
      extra: {
        name: env.X402_ASSET_SYMBOL,
        decimals: env.X402_ASSET_DECIMALS,
        tag: env.X402_CHALLENGE_TAG,
      },
    },
    description:
      "Routes chat requests for Hermes and other AI agents and returns a completion. Price: $0.02 USDC per request.",
    mimeType: "application/json",
    serviceName: env.X402_SERVICE_NAME,
    tags: [env.X402_CHALLENGE_TAG, "ai", "inference", "openai-compatible"],
    ...(env.X402_ICON_URL ? { iconUrl: env.X402_ICON_URL } : {}),
    extensions: chatDiscovery,
  },
  "POST /v1/goal-based-task": fixedPaymentRoute(GOAL_BASED_TASK),
  "POST /v1/free-tier": fixedPaymentRoute(FREE_TIER),
  "POST /v1/minor-coding-task": fixedPaymentRoute(MINOR_CODING_TASK),
};

const x402HttpServer = new x402HTTPResourceServer(resourceServer, routes);

x402HttpServer.onProtectedRequest(async (context) => {
  const bypassKey = env.X402_API_BYPASS_KEY.trim();
  const providedBypassKey = context.adapter.getHeader?.("x-api-key")?.trim();
  if (bypassKey && providedBypassKey && bypassKey === providedBypassKey) {
    return { grantAccess: true };
  }

  const requestedModelId = getRequestedModelId(context.adapter.getBody?.());
  if (context.adapter.getPath() === "/v1/chat/completions" && requestedModelId && !isAllowedModelId(requestedModelId)) {
    return {
      abort: true,
      reason: `Unsupported model '${requestedModelId}'.`,
    };
  }

  return undefined;
});

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

app.get("/", (request: Request, response: Response) => {
  if (request.get("accept")?.includes("text/html")) {
    response.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cost-Aware Inference | Paid AI APIs for Agents</title>
  <meta name="description" content="Four Algorand x402 AI APIs: cost-aware routing, goal-based agent work, basic tasks, and minor coding tasks.">
  <meta property="og:site_name" content="Cost-Aware Inference">
  <meta property="og:title" content="Cost-Aware Inference | Paid AI APIs for Agents">
  <meta property="og:description" content="AI routing and task endpoints for agents, paid per request with Algorand USDC.">
  <meta property="og:image" content="https://github.com/pixa-wallet.png">
  <link rel="icon" href="https://github.com/pixa-wallet.png">
</head>
<body>
  <h1>Cost-Aware Inference</h1>
  <p>Algorand x402 AI APIs for Hermes and other agents.</p>
  <ul>
    <li><code>POST /v1/chat/completions</code> — cost-aware AI router, $0.02 USDC</li>
    <li><code>POST /v1/goal-based-task</code> — hire an agent for a difficult goal, $3.00 USDC</li>
    <li><code>POST /v1/free-tier</code> — help with very basic tasks, $0.10 USDC</li>
    <li><code>POST /v1/minor-coding-task</code> — help with small coding tasks, $1.00 USDC</li>
  </ul>
  <p><a href="/v1/models">Model catalog</a> · <a href="https://github.com/pixa-wallet/cost-aware-inference">Source code</a></p>
</body>
</html>`);
    return;
  }
  response.json(buildDiscoveryManifest());
});

app.get("/health", (_request: Request, response: Response) => {
  response.json({
    status: "ok",
    service: "inference-gateway",
    date: new Date().toISOString(),
    routing: {
      modelOverrideEnabled: Boolean(env.OPENROUTER_MODEL_OVERRIDE.trim()),
      inferenceTestMode: env.INFERENCE_TEST_MODE,
    },
    x402: {
      network: env.X402_NETWORK,
      assetId: env.X402_ASSET_ID,
      assetSymbol: env.X402_ASSET_SYMBOL,
      facilitatorUrl: env.X402_FACILITATOR_URL,
    },
  });
});

app.get("/v1/models", (_request: Request, response: Response) => {
  response.json(buildModelsResponse());
});

app.use(paymentMiddlewareFromHTTPServer(x402HttpServer));

app.post("/v1/chat/completions", async (request: Request, response: Response) => {
  await handleChatCompletion(request, response);
});

app.post(GOAL_BASED_TASK.path, async (request: Request, response: Response) => {
  await handleChatCompletion(request, response, GOAL_BASED_TASK);
});

app.post(FREE_TIER.path, async (request: Request, response: Response) => {
  await handleChatCompletion(request, response, FREE_TIER);
});

app.post(MINOR_CODING_TASK.path, async (request: Request, response: Response) => {
  await handleChatCompletion(request, response, MINOR_CODING_TASK);
});

async function handleChatCompletion(
  request: Request,
  response: Response,
  offering?: FixedOffering,
): Promise<void> {
  const parsed = ChatCompletionRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        message: "Invalid chat completion request payload.",
        code: "invalid_request_body",
        details: parsed.error.flatten(),
      },
    });
    return;
  }

  const resolvedModel = offering
    ? {
        id: offering.id,
        intendedUpstreamModel: offering.model,
        resolvedUpstreamModel: offering.model,
        tier: offering.tier,
        priceUsdc: offering.priceUsdc,
      }
    : resolveModel(parsed.data.model, env.OPENROUTER_MODEL_OVERRIDE);

  if (env.INFERENCE_TEST_MODE) {
    response.setHeader("x-routify-requested-model", resolvedModel.id);
    response.setHeader("x-routify-tier", resolvedModel.tier);
    response.setHeader("x-routify-price-usdc", resolvedModel.priceUsdc);
    response.json({
      id: `chatcmpl_test_${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: resolvedModel.id,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Algorand x402 TestNet payment verified; deterministic inference test response returned.",
          },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
    return;
  }

  try {
    const upstream = await createOpenRouterChatCompletion(parsed.data, resolvedModel.resolvedUpstreamModel);

    if (!upstream.ok && offering?.id === MINOR_CODING_TASK.id) {
      sendCodingFallback(response, parsed.data.stream === true);
      return;
    }

    response.status(upstream.status);
    forwardUpstreamHeaders(upstream, response);
    response.setHeader("x-routify-requested-model", resolvedModel.id);
    response.setHeader("x-routify-tier", resolvedModel.tier);
    response.setHeader("x-routify-price-usdc", resolvedModel.priceUsdc);

    if (!upstream.ok) {
      response.status(502).json({ error: { message: "Inference request failed.", code: "upstream_request_failed" } });
      return;
    }

    if (parsed.data.stream) {
      await pipeUpstreamResponse(upstream, response, resolvedModel.id);
      return;
    }

    const bodyText = await upstream.text();
    response.send(publicCompletionBody(bodyText, resolvedModel.id));
  } catch (error) {
    if (offering?.id === MINOR_CODING_TASK.id && !response.headersSent) {
      sendCodingFallback(response, parsed.data.stream === true);
      return;
    }
    if (response.headersSent) {
      response.end();
      return;
    }
    response.status(502).json({
      error: {
        message: "Inference request failed.",
        code: "openrouter_request_failed",
      },
    });
  }
}

app.use((request: Request, response: Response) => {
  response.status(404).json({
    error: {
      message: `No route matches ${request.method} ${request.path}.`,
      code: "not_found",
    },
  });
});
