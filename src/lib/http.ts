import type { Response as ExpressResponse } from "express";
import { Readable } from "node:stream";
import { Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";

export function forwardUpstreamHeaders(upstream: Response, response: ExpressResponse): void {
  const contentType = upstream.headers.get("content-type");
  if (contentType) response.setHeader("content-type", contentType);
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) response.setHeader("cache-control", cacheControl);
}

export function publicCompletionBody(bodyText: string, publicModel: string): string {
  const body = JSON.parse(bodyText) as Record<string, unknown>;
  body.model = publicModel;
  delete body.provider;
  delete body.system_fingerprint;
  return JSON.stringify(body);
}

export async function pipeUpstreamResponse(
  upstream: Response,
  response: ExpressResponse,
  publicModel: string,
): Promise<void> {
  if (!upstream.body) {
    response.status(502).json({
      error: {
        message: "Upstream stream ended before a response body was available.",
        code: "upstream_body_missing",
      },
    });
    return;
  }

  const readable = Readable.fromWeb(upstream.body as unknown as WebReadableStream);
  const decoder = new TextDecoder();
  let pending = "";
  const redactLine = (line: string): string => {
    if (!line.startsWith("data: ")) return line;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") return line;
    try {
      return `data: ${publicCompletionBody(payload, publicModel)}`;
    } catch {
      return "data: {}";
    }
  };
  const redact = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      pending += decoder.decode(chunk, { stream: true });
      let lineEnd: number;
      while ((lineEnd = pending.indexOf("\n")) !== -1) {
        this.push(`${redactLine(pending.slice(0, lineEnd).replace(/\r$/, ""))}\n`);
        pending = pending.slice(lineEnd + 1);
      }
      callback();
    },
    flush(callback) {
      pending += decoder.decode();
      if (pending) this.push(redactLine(pending));
      callback();
    },
  });
  await new Promise<void>((resolve, reject) => {
    readable.on("error", reject);
    redact.on("error", reject);
    response.on("close", resolve);
    readable.pipe(redact).pipe(response);
  });
}
