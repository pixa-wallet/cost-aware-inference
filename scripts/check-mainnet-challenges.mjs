import assert from "node:assert/strict";
import { once } from "node:events";
import { validateDiscoveryExtensionSpec } from "@x402/extensions/bazaar";

const payTo = process.argv[2];
if (!payTo) throw new Error("Pass the MainNet pay-to address as the first argument.");
const liveBaseUrl = process.argv[3]?.replace(/\/$/, "");

process.env.NODE_ENV = "test";
process.env.X402_NETWORK = "mainnet";
process.env.X402_ASSET_ID = "31566704";
process.env.X402_PAY_TO = payTo;
process.env.INFERENCE_TEST_MODE = "false";
process.env.OPENROUTER_API_KEY = "challenge-test-no-upstream-call";
process.env.OPENROUTER_MODEL_OVERRIDE = "private-router-model";
process.env.OPENROUTER_GOAL_MODEL = "private-goal-model";
process.env.OPENROUTER_BASIC_MODEL = "private-basic-model";
process.env.X402_API_BYPASS_KEY = "";

let server;

try {
  let baseUrl = liveBaseUrl;
  if (!baseUrl) {
    const { app } = await import("../dist/app.js");
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
  const htmlResponse = await fetch(baseUrl, { headers: { accept: "text/html" } });
  assert.equal(htmlResponse.status, 200);
  const html = await htmlResponse.text();
  assert.match(html, /og:site_name/);
  assert.match(html, /\$0\.02 USDC/);
  assert.doesNotMatch(html, /nemotron|nvidia/i);
  const manifest = await (await fetch(baseUrl)).json();
  assert.equal(manifest.endpoints.filter((endpoint) => endpoint.paymentRequired).length, 3);
  assert.equal(manifest.endpoints.find((endpoint) => endpoint.path === "/v1/chat/completions").priceUsdc, "0.02");
  assert.doesNotMatch(JSON.stringify(manifest), /private-goal-model|private-basic-model|private-router-model|nemotron|nvidia/i);
  const models = await (await fetch(`${baseUrl}/v1/models`)).json();
  assert.ok(models.data.every((model) => model.priceUsdc === "0.02"));
  assert.doesNotMatch(JSON.stringify(models), /private-goal-model|private-basic-model|private-router-model|resolvedUpstreamModel|intendedUpstreamModel/i);
  const health = await (await fetch(`${baseUrl}/health`)).json();
  assert.doesNotMatch(JSON.stringify(health), /private-goal-model|private-basic-model|private-router-model|nemotron|nvidia/i);

  const cases = [
    ["/v1/goal-based-task", "3000000"],
    ["/v1/free-tier", "100000"],
    ["/v1/chat/completions", "20000"],
  ];

  for (const [path, amount] of cases) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });
    assert.equal(response.status, 402, `${path} should require payment`);
    const encoded = response.headers.get("payment-required");
    assert.ok(encoded, `${path} should include a payment challenge`);
    const challenge = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    const accepted = challenge.accepts[0];
    assert.equal(accepted.amount, amount, `${path} amount`);
    assert.equal(accepted.asset, "31566704", `${path} asset`);
    assert.equal(accepted.payTo, payTo, `${path} pay-to address`);
    assert.ok(accepted.network.startsWith("algorand:"), `${path} network`);
    assert.equal(accepted.extra?.tag, "x402-global-challenge", `${path} challenge tag`);
    assert.doesNotMatch(JSON.stringify(challenge), /private-goal-model|private-basic-model|private-router-model|nemotron|nvidia/i);
    assert.ok(challenge.extensions?.bazaar, `${path} Bazaar discovery`);
    const validation = validateDiscoveryExtensionSpec(challenge.extensions.bazaar);
    assert.equal(validation.valid, true, `${path} valid Bazaar discovery: ${JSON.stringify(validation.errors)}`);
    if (liveBaseUrl) {
      assert.ok(challenge.resource?.url?.startsWith(liveBaseUrl), `${path} public resource URL: ${JSON.stringify(challenge.resource)}`);
    }
    console.log(`${path}: 402, ${amount} micro-USDC`);
  }
  if (!liveBaseUrl) {
    const response = await fetch(`${baseUrl}/v1/free-tier`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    });
    const challenge = JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
    assert.equal(challenge.resource.url, `https://127.0.0.1:${server.address().port}/v1/free-tier`);
  }
} finally {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
