import assert from "node:assert/strict";
import { once } from "node:events";

process.env.NODE_ENV = "test";
process.env.X402_NETWORK = "testnet";
process.env.X402_ASSET_ID = "10458941";
process.env.INFERENCE_TEST_MODE = "false";
process.env.OPENROUTER_API_KEY = "routing-test-no-real-upstream-call";
process.env.OPENROUTER_MODEL_OVERRIDE = "private-router-model";
process.env.OPENROUTER_GOAL_MODEL = "private-goal-model";
process.env.OPENROUTER_BASIC_MODEL = "private-basic-model";
process.env.X402_API_BYPASS_KEY = "routing-test-bypass";

const upstreamModels = [];
let failUpstream = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input).endsWith("/chat/completions") && String(input).startsWith("https://openrouter.ai/")) {
    if (failUpstream) return new Response("Unavailable", { status: 503 });
    const body = JSON.parse(init.body);
    upstreamModels.push(body.model);
    if (body.stream) {
      const chunk = JSON.stringify({ id: "stream-test", object: "chat.completion.chunk", model: body.model, choices: [] });
      return new Response(`data: ${chunk}\n\ndata: [DONE]\n\n`, {
        status: 200,
        headers: { "content-type": "text/event-stream", "x-upstream-model": body.model },
      });
    }
    return new Response(JSON.stringify({ id: "test", object: "chat.completion", model: body.model, provider: "private-provider", choices: [] }), {
      status: 200,
      headers: { "content-type": "application/json", "x-upstream-model": body.model },
    });
  }
  return originalFetch(input, init);
};

const { app } = await import("../dist/app.js");
const server = app.listen(0, "127.0.0.1");

try {
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const cases = [
    ["/v1/goal-based-task", process.env.OPENROUTER_GOAL_MODEL],
    ["/v1/free-tier", process.env.OPENROUTER_BASIC_MODEL],
    ["/v1/minor-coding-task", process.env.OPENROUTER_GOAL_MODEL],
    ["/v1/chat/completions", process.env.OPENROUTER_MODEL_OVERRIDE],
  ];

  for (const [path, expectedModel] of cases) {
    const response = await originalFetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "routing-test-bypass" },
      body: JSON.stringify({
        model: path === "/v1/chat/completions" ? "auto" : "ignored-client-model",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    assert.equal(response.status, 200, `${path} response`);
    assert.equal(upstreamModels.at(-1), expectedModel, `${path} upstream model`);
    assert.equal(response.headers.get("x-upstream-model"), null, `${path} upstream header`);
    assert.equal(response.headers.get("x-routify-resolved-model"), null, `${path} model header`);
    const completion = await response.json();
    assert.equal(completion.model, path === "/v1/chat/completions" ? "auto" : path.slice(4), `${path} public model`);
    assert.equal(completion.provider, undefined, `${path} public provider`);
    console.log(`${path}: private upstream model, public ${completion.model}`);
  }

  const streamResponse = await originalFetch(`http://127.0.0.1:${address.port}/v1/goal-based-task`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": "routing-test-bypass" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }], stream: true }),
  });
  assert.equal(streamResponse.status, 200);
  const streamed = await streamResponse.text();
  assert.match(streamed, /"model":"goal-based-task"/);
  assert.doesNotMatch(streamed, /private-goal-model/);
  assert.match(streamed, /data: \[DONE\]/);

  failUpstream = true;
  for (const stream of [false, true]) {
    const response = await originalFetch(`http://127.0.0.1:${address.port}/v1/minor-coding-task`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "routing-test-bypass" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Make a small page" }], stream }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-routify-price-usdc"), "1.00");
    if (stream) {
      const text = await response.text();
      assert.match(text, /<!doctype html>/);
      assert.match(text, /data: \[DONE\]/);
    } else {
      const completion = await response.json();
      assert.equal(completion.model, "minor-coding-task");
      assert.match(completion.choices[0].message.content, /<!doctype html>/);
      assert.match(completion.choices[0].message.content, /<style>/);
    }
  }
} finally {
  globalThis.fetch = originalFetch;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
