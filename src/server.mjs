import { createApp } from "./app.mjs";
import { readConfig } from "./config.mjs";

try {
  const config = readConfig();
  const server = createApp(config);
  server.on("error", (error) => {
    console.error(JSON.stringify({ event: "startup_failed", code: error.code ?? "UNKNOWN" }));
    process.exitCode = 1;
  });
  server.listen(config.port, config.host, () => {
    console.log(JSON.stringify({ event: "listening", port: server.address().port, environment: config.environment }));
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ event: "shutdown" }));
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 5_000);
    deadline.unref();
    server.close(() => {
      clearTimeout(deadline);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
} catch (error) {
  console.error(JSON.stringify({ event: "configuration_failed", message: error.message }));
  process.exitCode = 1;
}
