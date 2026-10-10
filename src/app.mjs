import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function reply(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

export function createApp({ environment = "development", commit = "unknown" } = {}) {
  return createServer({ requestTimeout: 10_000, headersTimeout: 5_000 }, (request, response) => {
    let url;
    try {
      url = new URL(request.url, "http://localhost");
    } catch {
      reply(response, 400, { error: "Invalid request URL" });
      return;
    }

    const routes = ["/", "/health", "/version", "/api/greeting"];
    if (!routes.includes(url.pathname)) {
      reply(response, 404, { error: "Route not found" });
      return;
    }
    if (request.method !== "GET") {
      reply(response, 405, { error: "Method not allowed" }, { Allow: "GET" });
      return;
    }
    if (url.pathname === "/health") {
      reply(response, 200, { status: "ok", service: "engineering-demo-api" });
      return;
    }
    if (url.pathname === "/version") {
      reply(response, 200, { version, environment, commit });
      return;
    }
    if (url.pathname === "/api/greeting") {
      const names = url.searchParams.getAll("name");
      const name = (names[0] ?? "World").trim();
      if (names.length > 1 || !name || [...name].length > 80 || /[\p{Cc}\p{Cf}]/u.test(name)) {
        reply(response, 400, { error: "Provide one name with 1 to 80 characters and no control characters" });
        return;
      }
      reply(response, 200, { message: `Hello, ${name}!` });
      return;
    }
    reply(response, 200, {
      service: "engineering-demo-api",
      endpoints: ["/health", "/version", "/api/greeting?name=Shubham"],
    });
  });
}
