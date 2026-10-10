import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

// Pass dist/src/server.mjs to exercise the packaged runtime as well.
const child = spawn(process.execPath, [process.argv[2] ?? "src/server.mjs"], {
  env: { ...process.env, PORT: "0", HOST: "127.0.0.1", APP_ENV: "test", APP_COMMIT: "smoke-test" },
  stdio: ["ignore", "pipe", "inherit"],
});
const closed = once(child, "close");

try {
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server startup timed out")), 10_000);
    let output = "";
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Server exited before readiness: ${code}`)); });
    child.stdout.on("data", (chunk) => {
      output += chunk;
      let newline;
      while ((newline = output.indexOf("\n")) !== -1) {
        const line = output.slice(0, newline);
        output = output.slice(newline + 1);
        try {
          const event = JSON.parse(line);
          if (event.event === "listening") { clearTimeout(timer); resolve(event.port); }
        } catch { /* Ignore non-JSON output until the readiness timeout. */ }
      }
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");
  const version = await fetch(`${base}/version`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(version.status, 200);
  const metadata = await version.json();
  assert.equal(metadata.environment, "test");
  assert.equal(metadata.commit, "smoke-test");
  const greeting = await fetch(`${base}/api/greeting?name=Shubham`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(greeting.status, 200);
  assert.deepEqual(await greeting.json(), { message: "Hello, Shubham!" });
  console.log("Smoke checks passed: health, version, greeting");
} finally {
  child.kill("SIGTERM");
  await closed;
}
