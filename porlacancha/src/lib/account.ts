import { supabase } from "./supabase";

export async function updatePassword(next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (next.trim().length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  const { error } = await supabase.auth.updateUser({ password: next.trim() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function solicitarEliminacionCuenta(): Promise<
  { ok: true; yaPendiente: boolean } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("solicitar_eliminacion_cuenta");
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string; ya_pendiente?: boolean } | null;
  if (!row || row.ok === false) {
    return { ok: false, error: row?.error === "no_auth" ? "Tenés que iniciar sesión." : row?.error || "No se pudo pedir la baja." };
  }
  return { ok: true, yaPendiente: Boolean(row.ya_pendiente) };
}
