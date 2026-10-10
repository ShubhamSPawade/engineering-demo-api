import assert from "node:assert/strict";
import { test } from "node:test";
import { readConfig } from "../src/config.mjs";

test("local defaults bind only to loopback", () => {
  assert.deepEqual(readConfig({}), { port: 3000, host: "127.0.0.1", environment: "development", commit: "unknown" });
});

test("deployment settings support an ephemeral test port", () => {
  assert.deepEqual(readConfig({ PORT: "0", HOST: "0.0.0.0", APP_ENV: "staging", APP_COMMIT: "abc" }), {
    port: 0, host: "0.0.0.0", environment: "staging", commit: "abc",
  });
});

for (const port of ["", "-1", "3.5", "abc", "3000junk", "65536"]) {
  test(`invalid port ${JSON.stringify(port)} fails before startup`, () => {
    assert.throws(() => readConfig({ PORT: port }), /PORT/);
  });
}

test("unknown deployment environment is rejected", () => {
  assert.throws(() => readConfig({ APP_ENV: "prodution" }), /APP_ENV/);
});

test("empty host is rejected", () => {
  assert.throws(() => readConfig({ HOST: " " }), /HOST/);
});
