import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).trim();
}

const sql = fs.readFileSync(path.join(root, "supabase/migrations/040_jugador_perfiles.sql"), "utf8");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function tryQuery(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 400) };
}

const a = await tryQuery(`${url}/pg/query`, { query: sql });
console.log("pg/query", a.status, a.text);
if (a.status >= 400) {
  const b = await tryQuery(`${url}/rest/v1/rpc/exec_sql`, { query: sql });
  console.log("rpc/exec_sql", b.status, b.text);
}
