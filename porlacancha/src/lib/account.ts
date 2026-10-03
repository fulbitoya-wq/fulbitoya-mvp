import { supabase } from "./supabase";

export async function updatePassword(next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (next.trim().length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  }
  const { error } = await supabase.auth.updateUser({ password: next.trim() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function eliminarMiCuenta(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { data, error } = await supabase.rpc("eliminar_mi_cuenta");
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string; equipos?: string } | null;
  if (!row || row.ok === false) {
    if (row?.error === "no_auth") return { ok: false, error: "Tenés que iniciar sesión." };
    if (row?.error === "capitan_debe_transferir") {
      return {
        ok: false,
        error: row.equipos
          ? `Primero transferí la capitanía de: ${row.equipos}.`
          : "Primero transferí la capitanía de tus equipos.",
      };
    }
    return { ok: false, error: row?.error || "No se pudo borrar la cuenta." };
  }
  return { ok: true };
}
