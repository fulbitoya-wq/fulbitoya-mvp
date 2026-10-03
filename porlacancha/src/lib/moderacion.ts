import { supabase } from "./supabase";

export type MotivoReporte = "acoso" | "perfil_falso" | "contenido" | "spam" | "otro";

export const MOTIVOS_REPORTE: { id: MotivoReporte; label: string }[] = [
  { id: "acoso", label: "Acoso o insultos" },
  { id: "perfil_falso", label: "Perfil falso o suplantación" },
  { id: "contenido", label: "Foto o texto inapropiado" },
  { id: "spam", label: "Spam o publicidad" },
  { id: "otro", label: "Otro" },
];

export type BloqueadoItem = { id: string; nombre: string | null; username: string | null };

function rpcFail(data: { ok?: boolean; error?: string } | null, error: { message: string } | null): string {
  if (error) return error.message;
  const code = data?.error;
  if (code === "no_auth") return "Tenés que iniciar sesión.";
  if (code === "no_auto") return "No podés hacer eso con tu cuenta.";
  if (code === "ya_reportado") return "Ya denunciaste a esta persona. La estamos revisando.";
  if (code === "motivo_invalido") return "Elegí un motivo.";
  if (code === "usuario_no_encontrado") return "No encontramos a esa persona.";
  return code || "No se pudo completar.";
}

export async function estaBloqueado(jugadorId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("jugador_bloqueos")
    .select("bloqueado_id")
    .eq("bloqueado_id", jugadorId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

export async function bloquearUsuario(jugadorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("bloquear_usuario", { p_usuario_id: jugadorId });
  const row = data as { ok?: boolean; error?: string } | null;
  if (error || !row || row.ok === false) return { ok: false, error: rpcFail(row, error) };
  return { ok: true };
}

export async function desbloquearUsuario(jugadorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("desbloquear_usuario", { p_usuario_id: jugadorId });
  const row = data as { ok?: boolean; error?: string } | null;
  if (error || !row || row.ok === false) return { ok: false, error: rpcFail(row, error) };
  return { ok: true };
}

export async function reportarUsuario(
  jugadorId: string,
  motivo: MotivoReporte,
  detalle?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("reportar_usuario", {
    p_usuario_id: jugadorId,
    p_motivo: motivo,
    p_detalle: detalle?.trim() || null,
  });
  const row = data as { ok?: boolean; error?: string } | null;
  if (error || !row || row.ok === false) return { ok: false, error: rpcFail(row, error) };
  return { ok: true };
}

export async function listUsuariosBloqueados(): Promise<BloqueadoItem[]> {
  const { data, error } = await supabase.rpc("listar_usuarios_bloqueados");
  if (error || !data) return [];
  return (data as BloqueadoItem[]).map((r) => ({
    id: String(r.id),
    nombre: r.nombre,
    username: r.username,
  }));
}
