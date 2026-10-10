export function readConfig(env = process.env) {
  const portText = env.PORT ?? "3000";
  if (!/^\d+$/.test(portText)) throw new Error("PORT must be an integer from 0 to 65535");
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer from 0 to 65535");
  }
  const host = env.HOST ?? "127.0.0.1";
  if (!host.trim()) throw new Error("HOST must not be empty");
  const environment = env.APP_ENV ?? "development";
  if (!["development", "staging", "production", "test"].includes(environment)) {
    throw new Error("APP_ENV must be development, staging, production, or test");
  }
  return { port, host, environment, commit: env.APP_COMMIT ?? "unknown" };
}
