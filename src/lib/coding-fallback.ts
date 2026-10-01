import { randomInt, randomUUID } from "node:crypto";
import type { Response } from "express";

const examples = [
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome Card</title>
  <style>
    body { min-height: 100vh; display: grid; place-items: center; margin: 0; background: #eef2ff; font: 16px system-ui, sans-serif; }
    .card { max-width: 28rem; padding: 2rem; border-radius: 1rem; background: white; box-shadow: 0 12px 30px #312e8140; }
    .card h1 { margin-top: 0; color: #312e81; }
    .card a { display: inline-block; padding: .75rem 1rem; border-radius: .5rem; background: #4f46e5; color: white; text-decoration: none; }
  </style>
</head>
<body><main class="card"><h1>Hello, world!</h1><p>A simple responsive welcome card.</p><a href="#start">Get started</a></main></body>
</html>`,
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Profile</title>
  <style>
    * { box-sizing: border-box; }
    body { min-height: 100vh; display: grid; place-items: center; margin: 0; background: #f0fdf4; font: 16px system-ui, sans-serif; }
    article { width: min(90vw, 24rem); padding: 2rem; text-align: center; border: 1px solid #bbf7d0; border-radius: 1.25rem; background: white; }
    .avatar { display: grid; place-items: center; width: 5rem; height: 5rem; margin: auto; border-radius: 50%; background: #16a34a; color: white; font-size: 2rem; }
    p { color: #475569; }
  </style>
</head>
<body><article><div class="avatar" aria-hidden="true">A</div><h1>Alex Rivera</h1><p>Frontend developer building clean, useful interfaces.</p></article></body>
</html>`,
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Newsletter Form</title>
  <style>
    body { min-height: 100vh; display: grid; place-items: center; margin: 0; background: #fff7ed; font: 16px system-ui, sans-serif; }
    form { width: min(90vw, 30rem); padding: 2rem; border-radius: 1rem; background: white; box-shadow: 0 8px 24px #9a341240; }
    label { display: block; margin: 1rem 0 .4rem; font-weight: 600; }
    input { width: 100%; padding: .75rem; border: 1px solid #cbd5e1; border-radius: .5rem; font: inherit; }
    button { margin-top: 1rem; padding: .75rem 1rem; border: 0; border-radius: .5rem; background: #ea580c; color: white; font: inherit; cursor: pointer; }
  </style>
</head>
<body><form><h1>Get updates</h1><p>Join our newsletter.</p><label for="email">Email address</label><input id="email" type="email" autocomplete="email" required><button type="submit">Subscribe</button></form></body>
</html>`,
];

export function sendCodingFallback(response: Response, stream: boolean): void {
  const content = examples[randomInt(examples.length)];
  const id = `chatcmpl_${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const model = "minor-coding-task";
  response.status(200);
  response.setHeader("x-routify-requested-model", model);
  response.setHeader("x-routify-tier", model);
  response.setHeader("x-routify-price-usdc", "1.00");
  if (stream) {
    response.setHeader("content-type", "text/event-stream; charset=utf-8");
    response.setHeader("cache-control", "no-cache");
    response.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }] })}\n\n`);
    response.end(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`);
    return;
  }
  response.json({
    id,
    object: "chat.completion",
    created,
    model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}
