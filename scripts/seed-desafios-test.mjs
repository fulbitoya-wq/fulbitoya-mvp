/**
 * Seed one-off: 3 desafíos de prueba usando predios reales de FulbitoYa.
 * Uso: node scripts/seed-desafios-test.mjs
 */
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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const MARKER = "[seed:porlacancha-test]";

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function rest(pathname, init = {}) {
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${pathname}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const canchas = await rest(
  "canchas?select=id,owner_id,nombre,direccion,barrio,lat,lng,place_id,activa&activa=eq.true&order=created_at.asc"
);

const real = (canchas ?? []).filter((c) => {
  const n = (c.nombre || "").trim().toLowerCase();
  const d = (c.direccion || "").trim().toLowerCase();
  return n && n !== "test" && d && d !== "test";
});

if (!real.length) {
  console.error("No hay predios con nombre y dirección reales.");
  process.exit(1);
}

console.log("Predios:");
for (const c of real) {
  console.log(`- ${c.nombre} | ${c.direccion} | ${c.barrio || ""} | ${c.lat},${c.lng}`);
}

const pick = real.slice(0, 3);
while (pick.length < 3) pick.push(real[0]);

const BA = { lat: -34.6037, lng: -58.3816 };

function geo(c) {
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  return BA;
}

await rest(`desafios?descripcion=eq.${encodeURIComponent(MARKER)}`, { method: "DELETE" });

const rows = [
  {
    predio: pick[0],
    titulo: "Por la cancha y $200.000 arriba",
    tipo: "f7",
    premio: 200000,
    fecha: isoDate(1),
    hora: "21:00:00",
  },
  {
    predio: pick[1],
    titulo: "Por la cancha y $100.000 arriba",
    tipo: "f5",
    premio: 100000,
    fecha: isoDate(2),
    hora: "22:00:00",
  },
  {
    predio: pick[2],
    titulo: "Solo por la cancha",
    tipo: "f9",
    premio: 0,
    fecha: isoDate(3),
    hora: "20:00:00",
  },
].map(({ predio, titulo, tipo, premio, fecha, hora }) => {
  const g = geo(predio);
  return {
    owner_id: predio.owner_id,
    cancha_id: predio.id,
    titulo,
    tipo,
    premio,
    direccion: predio.direccion?.trim()
      ? `${predio.nombre} · ${predio.direccion.trim()}`
      : predio.nombre,
    barrio: predio.barrio,
    place_id: predio.place_id,
    lat: g.lat,
    lng: g.lng,
    fecha,
    hora_inicio: hora,
    duracion_min: 90,
    descripcion: MARKER,
    estado: "abierto",
  };
});

const inserted = await rest("desafios", { method: "POST", body: JSON.stringify(rows) });
console.log(`Insertados: ${inserted.length}`);
for (const d of inserted) {
  console.log(`- ${d.titulo} @ ${d.direccion} (${d.fecha} ${d.hora_inicio})`);
}

let equipos = [];
try {
  equipos = await rest("equipos?select=id,nombre,escudo_url,activo&activo=eq.true&order=created_at.asc");
} catch {
  equipos = await rest("equipos?select=id,nombre,escudo_url&order=created_at.asc");
}
const team = (equipos ?? []).find((e) => {
  const n = (e.nombre || "").trim().toLowerCase();
  return n && n !== "test";
});
if (team && inserted[0]) {
  await rest(`desafios?id=eq.${inserted[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({ descripcion: `${MARKER} equipo:${team.id}` }),
  });
  console.log(`Inscripto en el desafío de $200.000: ${team.nombre}`);
} else {
  console.log("No encontré un equipo para inscribir.");
}
