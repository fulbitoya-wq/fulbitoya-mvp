/* eslint-disable no-console */
/**
 * Seeds `provincias`, `partidos` and `localidades` from Argentina's Georef API.
 *
 * - Idempotent via `georef_id` unique constraints.
 * - Requires a Supabase service-role key.
 *
 * Env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:
 *   node scripts/seed_locations_from_georef.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local (node doesn't auto-load it)
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip wrapping quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GEORF_BASE = "https://apis.datos.gob.ar/georef/api";

if (!SUPABASE_URL) {
  console.error("Missing env var NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env var SUPABASE_SERVICE_ROLE_KEY (service role key from Supabase)");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Georef API error ${res.status}: ${text}`);
  }
  return res.json();
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertInChunks(table, rows, onConflict, chunkSize = 200) {
  const chunks = chunkArray(rows, chunkSize);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const { error } = await supabaseAdmin
      .from(table)
      .upsert(chunk, { onConflict });
    if (error) throw error;
  }
}

async function getAllPages(endpoint, params) {
  const pageSize = params.max ?? 500;
  let inicio = params.inicio ?? 0;
  const totalAll = { items: [], total: null };

  // Defensive pagination to avoid infinite loops
  for (let guard = 0; guard < 10000; guard++) {
    const url = new URL(`${GEORF_BASE}/${endpoint}`);
    for (const [k, v] of Object.entries({ ...params, inicio, max: pageSize })) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const json = await fetchJson(url.toString());
    const items = json?.[endpoint] || json?.[endpoint.replace("-", "_")] || json?.[endpoint + "s"] || json?.[`${endpoint}s`];

    // Georef uses plural keys like `provincias`, `departamentos`, `localidades`
    // We'll handle these explicitly.
    let arr;
    if (endpoint === "provincias") arr = json.provincias;
    if (endpoint === "departamentos") arr = json.departamentos;
    if (endpoint === "localidades") arr = json.localidades;
    if (!Array.isArray(arr)) arr = [];

    totalAll.items.push(...arr);
    totalAll.total = json.total ?? totalAll.total;

    if (arr.length === 0) break;

    inicio += arr.length;
    const stopAt = json.total ?? null;
    if (stopAt !== null && inicio >= stopAt) break;

    // small delay to be polite to the API
    await new Promise((r) => setTimeout(r, 100));
  }

  return totalAll.items;
}

async function main() {
  // If you seeded with a sample migration (georef_id = null), we may create duplicates.
  // To avoid that, we delete rows with georef_id null, but only if the amount is small.
  const MAX_NULL_ROWS_TO_DELETE = 5000;
  for (const table of ["provincias", "partidos", "localidades"]) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    const nullCount = count ?? 0;
    if (nullCount > 0) {
      if (nullCount > MAX_NULL_ROWS_TO_DELETE) {
        throw new Error(
          `Aborting: too many rows with georef_id = null in "${table}" (${nullCount}). ` +
          `Seed them manually or remove duplicates by name.`
        );
      }
      console.log(`Deleting ${nullCount} rows with georef_id = null from ${table}...`);
      const { error: delErr } = await supabaseAdmin.from(table).delete().is("georef_id", null);
      if (delErr) throw delErr;
    }
  }

  console.log("Seeding provinces from Georef...");

  const provinciasResp = await getAllPages("provincias", { max: 5000 });

  const provinciasRows = provinciasResp.map((p) => ({
    nombre: p.nombre,
    georef_id: p.id,
  }));

  await upsertInChunks("provincias", provinciasRows, "georef_id", 200);

  console.log(`Upserted provincias: ${provinciasRows.length}`);

  const { data: provinciasDb, error: provinciasDbErr } = await supabaseAdmin
    .from("provincias")
    .select("id, nombre, georef_id");
  if (provinciasDbErr) throw provinciasDbErr;

  const provinciaMap = new Map((provinciasDb ?? []).map((p) => [p.georef_id, p]));

  // Departments / Partidos
  for (const prov of provinciasResp) {
    const provRow = provinciaMap.get(prov.id);
    if (!provRow) continue;

    console.log(`Seeding partidos for provincia: ${prov.nombre} (${prov.id})`);

    const departamentosResp = await getAllPages("departamentos", {
      provincia: prov.id,
      max: 5000,
    });

    const partidosRows = departamentosResp.map((d) => ({
      nombre: d.nombre,
      georef_id: d.id,
      provincia_id: provRow.id,
    }));

    await upsertInChunks("partidos", partidosRows, "georef_id", 250);
    console.log(`Upserted partidos: ${partidosRows.length} for ${provRow.nombre}`);

    const { data: partidosDb, error: partidosDbErr } = await supabaseAdmin
      .from("partidos")
      .select("id, georef_id, provincia_id")
      .eq("provincia_id", provRow.id);
    if (partidosDbErr) throw partidosDbErr;

    const partidoMap = new Map((partidosDb ?? []).map((m) => [m.georef_id, m]));

    // Localidades
    for (const dep of departamentosResp) {
      const depRow = partidoMap.get(dep.id);
      if (!depRow) continue;

      // Fetch localidades in pages (we can't load everything without pagination)
      console.log(`  Seeding localidades for partido: ${dep.nombre} (${dep.id})`);

      let inicio = 0;
      const pageSize = 500;

      for (let guard = 0; guard < 2000; guard++) {
        const url = new URL(`${GEORF_BASE}/localidades`);
        url.searchParams.set("provincia", prov.id);
        url.searchParams.set("departamento", dep.id);
        url.searchParams.set("max", pageSize);
        url.searchParams.set("inicio", inicio);

        // minimize payload
        url.searchParams.set("campos", "id,nombre,centroide,departamento,provincia,localidad_censal");

        const json = await fetchJson(url.toString());
        const locs = Array.isArray(json.localidades) ? json.localidades : [];
        if (locs.length === 0) break;

        const localidadesRows = locs.map((l) => ({
          nombre: l.nombre,
          georef_id: l.id,
          partido_id: depRow.id,
          codigo_postal: null,
          lat: l?.centroide?.lat ?? null,
          lng: l?.centroide?.lon ?? null,
        }));

        await upsertInChunks("localidades", localidadesRows, "georef_id", 250);

        inicio += locs.length;
        const total = json.total ?? null;
        if (total !== null && inicio >= total) break;

        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  console.log("Done seeding locations.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

