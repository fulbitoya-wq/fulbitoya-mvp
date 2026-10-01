import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.resolve(appRoot, "../shared");
const dest = path.resolve(appRoot, ".generated/shared");

if (!fs.existsSync(src)) {
  console.error("No está la carpeta shared (../shared). En Vercel activá Include files outside Root Directory.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
