/**
 * Same Git repo, two Vercel projects.
 * - FulbitoYa: Root Directory vacío (raíz) o VERCEL_BUILD_APP=fulbitoya
 * - PorLaCancha web: Root Directory `porlacancha-web` o VERCEL_BUILD_APP=porlacancha-web
 */
export function vercelApp() {
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.endsWith("/porlacancha-web")) return "porlacancha-web";

  const explicit = (process.env.VERCEL_BUILD_APP || "").trim().toLowerCase();
  if (explicit === "porlacancha-web" || explicit === "porlacancha") return "porlacancha-web";
  if (explicit === "fulbitoya" || explicit === "fulbito") return "fulbitoya";

  const name = (process.env.VERCEL_PROJECT_NAME || "").toLowerCase();
  if (name.includes("porlacancha")) return "porlacancha-web";
  return "fulbitoya";
}
