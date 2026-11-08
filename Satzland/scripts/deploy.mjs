// Publishes the app to your own Cloudflare account; the one-time setup is described in ../HOSTING.md.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const settings = fileURLToPath(new URL("../.env.cloudflare", import.meta.url));
const fail = message => { console.error(message); process.exit(1); };
if (!existsSync(settings)) fail("Datei .env.cloudflare fehlt. Vorlage kopieren: cp .env.cloudflare.example .env.cloudflare");
process.loadEnvFile(settings);
if (!process.env.SCHREIBI_D1_DATABASE_ID?.trim()) fail("In .env.cloudflare fehlt noch SCHREIBI_D1_DATABASE_ID.");
// Access can only be switched on once the Worker exists, so the first upload may run without it.
// Without these values the site stays locked for everyone; it never falls back to an open login.
if (!process.env.ACCESS_TEAM_DOMAIN?.trim() || !process.env.ACCESS_AUD?.trim()) console.warn("Hinweis: ACCESS_TEAM_DOMAIN/ACCESS_AUD fehlen noch – die Seite bleibt gesperrt, bis Cloudflare Access eingerichtet ist.");

const run = (...args) => {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: fileURLToPath(new URL("..", import.meta.url)) });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const wrangler = (...args) => run("--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js", ...args, "--config", "dist/server/wrangler.json");

run("scripts/run-framework.mjs", "build");
wrangler("d1", "migrations", "apply", "DB", "--remote");
wrangler("deploy");
