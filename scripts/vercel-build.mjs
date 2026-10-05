import { spawnSync } from "node:child_process";
import { vercelApp } from "./vercel-app.mjs";

const app = vercelApp();
const cmd =
  app === "porlacancha-web"
    ? ["npm", "run", "build", "--prefix", "porlacancha-web"]
    : ["npm", "run", "build"];

const result = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
