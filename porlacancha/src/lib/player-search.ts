import type { ModoJuego } from "./perfil";
import { getPlayerRank, type PlayerRange } from "./player-ranks";
import { supabase } from "./supabase";

export type SearchPlayer = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  level: number | null;
  verifiedMatches: number;
  range: PlayerRange;
  primaryPosition: string;
  secondaryPositions: string[];
  zone: string;
  formats: string[];
  formatLabels: string[];
  skilledFoot: string;
  buscaEquipo: boolean;
  modoJuego: ModoJuego;
  tarifaPartido: number | null;
  teams: { id: string; name: string }[];
};

export type PositionFilter = "all" | "ARQ" | "DEF" | "MED" | "DEL";

const FILTER_POS: Record<Exclude<PositionFilter, "all">, string[]> = {
  ARQ: ["ARQ", "Arquero"],
  DEF: ["DEF", "Defensor", "CEN"],
  MED: ["MED", "Mediocampista", "VOL"],
  DEL: ["DEL", "Delantero", "EXT", "SEG"],
};

const PUESTO_CODE: Record<string, string> = {
  Arquero: "ARQ",
  Defensor: "DEF",
  Mediocampista: "MED",
  Delantero: "DEL",
};

function asSearchPlayer(row: Record<string, unknown>, teams: SearchPlayer["teams"]): SearchPlayer {
  const primary = String(row.puesto_principal ?? "").trim();
  const secondary = String(row.puesto_secundario ?? "").trim();
  const username = String(row.username ?? "");
  const formatos = Array.isArray(row.formatos) ? row.formatos.map(String) : [];
  return {
    id: String(row.id),
    name: String(row.nombre ?? username),
    username,
    avatarUrl: typeof row.avatar_url === "string" && row.avatar_url ? row.avatar_url : undefined,
    level: null,
    verifiedMatches: 0,
    range: getPlayerRank(null, 0),
    primaryPosition: primary,
    secondaryPositions: secondary ? [secondary] : [],
    zone: String(row.zona ?? "").trim() || "Zona no cargada",
    formats: formatos,
    formatLabels: formatos.map((f) => f.replace(/^f/i, "F").toUpperCase()),
    skilledFoot: String(row.pierna ?? "").trim() || "—",
    buscaEquipo: true,
    modoJuego: row.modo_juego === "cobro_por_partido" ? "cobro_por_partido" : "sin_cobrar",
    tarifaPartido:
      row.tarifa_partido != null && Number.isFinite(Number(row.tarifa_partido))
        ? Number(row.tarifa_partido)
        : null,
    teams,
  };
}

export function playerMatchesQuery(p: SearchPlayer, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [p.name, p.username, p.primaryPosition, ...p.secondaryPositions, p.zone].join(" ").toLowerCase();
  return hay.includes(s);
}

export function playerMatchesFilter(p: SearchPlayer, filter: PositionFilter): boolean {
  if (filter === "all") return true;
  const set = FILTER_POS[filter];
  const code = PUESTO_CODE[p.primaryPosition] ?? p.primaryPosition;
  return set.includes(p.primaryPosition) || set.includes(code) || p.secondaryPositions.some((x) => set.includes(x) || set.includes(PUESTO_CODE[x] ?? x));
}

export async function listJugadoresBusqueda(): Promise<{ ok: true; players: SearchPlayer[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("jugador_busqueda_publica")
    .select("id, nombre, username, avatar_url, zona, puesto_principal, puesto_secundario, pierna, formatos, modo_juego, tarifa_partido")
    .order("nombre", { ascending: true });
  if (error) return { ok: false, error: error.message };
  const rows = (data ?? []) as Record<string, unknown>[];
  const ids = rows.map((row) => String(row.id));
  const teamsByUser = new Map<string, SearchPlayer["teams"]>();
  if (ids.length > 0) {
    const { data: mem } = await supabase
      .from("equipo_miembros")
      .select("usuario_id, estado, equipos(id, nombre, activo)")
      .in("usuario_id", ids)
      .eq("estado", "activo");
    for (const row of mem ?? []) {
      const rec = row as { usuario_id?: string; equipos?: unknown };
      const nested = rec.equipos;
      const eq = Array.isArray(nested) ? nested[0] : nested;
      if (!eq || typeof eq !== "object" || !rec.usuario_id) continue;
      const t = eq as { id?: string; nombre?: string; activo?: boolean };
      if (t.activo === false || !t.id) continue;
      const list = teamsByUser.get(rec.usuario_id) ?? [];
      list.push({ id: t.id, name: t.nombre ?? "Equipo" });
      teamsByUser.set(rec.usuario_id, list);
    }
  }
  return { ok: true, players: rows.map((row) => asSearchPlayer(row, teamsByUser.get(String(row.id)) ?? [])) };
}
