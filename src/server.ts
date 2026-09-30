import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`inference-gateway listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`received ${signal}, shutting down inference-gateway`);
  server.close((error?: Error) => {
    if (error) {
      console.error("graceful shutdown failed", error);
      process.exit(1);
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error("forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
