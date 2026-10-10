import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

mkdirSync("dist/src", { recursive: true });
for (const name of ["app.mjs", "config.mjs", "server.mjs"]) {
  copyFileSync(join("src", name), join("dist/src", name));
}
copyFileSync("package.json", "dist/package.json");
writeFileSync("dist/build-info.json", JSON.stringify({
  commit: process.env.APP_COMMIT ?? "unknown",
  builtAt: new Date().toISOString(),
}, null, 2) + "\n");
console.log("Runtime files packaged in dist/");
