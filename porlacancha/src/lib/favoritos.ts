import { supabase } from "./supabase";

export async function listMisFavoritos(): Promise<string[]> {
  const { data, error } = await supabase.from("jugador_favoritos").select("jugador_id");
  if (error || !data) return [];
  return data.map((r) => String((r as { jugador_id: string }).jugador_id));
}

export async function toggleFavorito(
  jugadorId: string
): Promise<{ ok: true; favorito: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("toggle_favorito", { p_jugador_id: jugadorId });
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string; favorito?: boolean } | null;
  if (!row || row.ok === false) {
    const code = row?.error;
    if (code === "no_auth") return { ok: false, error: "Tenés que iniciar sesión." };
    if (code === "no_auto") return { ok: false, error: "No podés marcarte a vos." };
    return { ok: false, error: code || "No se pudo actualizar el favorito." };
  }
  return { ok: true, favorito: Boolean(row.favorito) };
}
