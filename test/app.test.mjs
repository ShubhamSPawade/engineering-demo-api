import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createApp } from "../src/app.mjs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

async function withApp(t, run) {
  const server = createApp({ environment: "test", commit: "test-commit" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  await run((path, options = {}) => fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(5_000) }));
}

test("health probe returns a healthy service without exposing configuration", async (t) => {
  await withApp(t, async (request) => {
    const response = await request("/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "engineering-demo-api" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("version identifies the component and runtime environment", async (t) => {
  await withApp(t, async (request) => {
    const response = await request("/version");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { version, environment: "test", commit: "test-commit" });
  });
});

test("root lists available endpoints", async (t) => {
  await withApp(t, async (request) => {
    const response = await request("/");
    assert.equal(response.status, 200);
    assert.ok((await response.json()).endpoints.includes("/health"));
  });
});

for (const [query, expected] of [
  ["", "Hello, World!"],
  ["?name=Shubham", "Hello, Shubham!"],
  ["?name=%20Shubham%20", "Hello, Shubham!"],
  [`?name=${encodeURIComponent("शुभम")}`, "Hello, शुभम!"],
]) {
  test(`greeting accepts ${query || "a missing name"}`, async (t) => {
    await withApp(t, async (request) => {
      const response = await request(`/api/greeting${query}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { message: expected });
    });
  });
}

for (const query of ["?name=", "?name=%20%20", `?name=${"a".repeat(81)}`, "?name=a&name=b", "?name=a%00b"]) {
  test(`greeting rejects invalid input ${query}`, async (t) => {
    await withApp(t, async (request) => {
      const response = await request(`/api/greeting${query}`);
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).error, "string");
    });
  });
}

test("unknown routes return a JSON 404", async (t) => {
  await withApp(t, async (request) => {
    const response = await request("/missing");
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Route not found" });
  });
});

test("unsupported methods cannot change server state", async (t) => {
  await withApp(t, async (request) => {
    const response = await request("/api/greeting", { method: "POST" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
  });
});
