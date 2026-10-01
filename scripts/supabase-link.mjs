/**
 * Vincula este repo al proyecto Supabase remoto (project ref desde NEXT_PUBLIC_SUPABASE_URL).
 * Requiere: npx supabase login   (o env SUPABASE_ACCESS_TOKEN)
 * No imprime URLs ni keys.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("No hay .env.local en la raíz del repo.");
  process.exit(1);
}

const envFile = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envFile.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  process.exit(1);
}

let ref;
try {
  ref = new URL(url).hostname.split(".")[0];
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL no es una URL válida.");
  process.exit(1);
}

if (!ref || ref.length < 8) {
  console.error("No pude leer el project ref.");
  process.exit(1);
}

console.log("Link al project ref:", ref);
const r = spawnSync(
  "npx",
  ["supabase@2.117.0", "link", "--project-ref", ref, "--yes"],
  { cwd: root, stdio: "inherit", shell: true }
);
process.exit(r.status ?? 1);
