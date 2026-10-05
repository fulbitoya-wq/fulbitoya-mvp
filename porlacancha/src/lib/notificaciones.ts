import { supabase } from "./supabase";

export const NOTIF_TIPOS = [
  "invitacion_equipo",
  "solicitud_equipo",
  "respuesta_solicitud",
  "respuesta_invitacion",
  "capitan_transferido",
  "expulsado_equipo",
  "convocado_partido",
  "baja_convocatoria",
  "inscripcion_desafio",
  "inscripcion_cancelada",
  "reserva_nueva_predio",
  "turno_enlace_ocupado",
] as const;

export type NotifTipo = (typeof NOTIF_TIPOS)[number];

export const NOTIF_LABELS: Record<NotifTipo, string> = {
  invitacion_equipo: "Invitaciones a equipos",
  solicitud_equipo: "Pedidos para entrar a tu equipo",
  respuesta_solicitud: "Respuestas a tus solicitudes",
  respuesta_invitacion: "Respuestas a tus invitaciones",
  capitan_transferido: "Cambio de capitanía",
  expulsado_equipo: "Te sacaron de un equipo",
  convocado_partido: "Te convocaron a un partido",
  baja_convocatoria: "Te sacaron de una convocatoria",
  inscripcion_desafio: "Un equipo se inscribió a tu desafío",
  inscripcion_cancelada: "Se canceló una inscripción",
  reserva_nueva_predio: "Reservas de tu predio",
  turno_enlace_ocupado: "Enlaces de un horario ya tomado",
};

export type DestinoNotif = "inbox" | "equipo" | "equipos" | "desafio" | "matches";

export type Notificacion = {
  id: string;
  tipo: NotifTipo;
  titulo: string;
  cuerpo: string;
  destino: DestinoNotif;
  equipoId: string | null;
  desafioId: string | null;
  leida: boolean;
  createdAt: string;
};

type Row = {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  datos: { destino?: string; equipo_id?: string; desafio_id?: string } | null;
  leida_at: string | null;
  created_at: string;
};

function parseDestino(raw: string | undefined): DestinoNotif {
  if (raw === "inbox" || raw === "equipo" || raw === "equipos" || raw === "desafio" || raw === "matches") return raw;
  return "equipos";
}

function mapRow(r: Row): Notificacion {
  const datos = r.datos ?? {};
  return {
    id: r.id,
    tipo: (NOTIF_TIPOS as readonly string[]).includes(r.tipo) ? (r.tipo as NotifTipo) : "invitacion_equipo",
    titulo: r.titulo,
    cuerpo: r.cuerpo,
    destino: parseDestino(datos.destino),
    equipoId: datos.equipo_id ?? null,
    desafioId: datos.desafio_id ?? null,
    leida: Boolean(r.leida_at),
    createdAt: r.created_at,
  };
}

export async function listNotificaciones(): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from("notificaciones")
    .select("id, tipo, titulo, cuerpo, datos, leida_at, created_at")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error || !data) return [];
  return (data as Row[]).map(mapRow);
}

export async function countUnreadNotificaciones(): Promise<number> {
  const { count, error } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .is("leida_at", null);
  if (error || count == null) return 0;
  return count;
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  await supabase.from("notificaciones").update({ leida_at: new Date().toISOString() }).eq("id", id).is("leida_at", null);
}

export async function marcarTodasNotificacionesLeidas(): Promise<void> {
  await supabase.rpc("marcar_todas_notificaciones_leidas");
}

export async function listPreferenciasNotificacion(): Promise<Record<NotifTipo, boolean>> {
  const base = Object.fromEntries(NOTIF_TIPOS.map((t) => [t, true])) as Record<NotifTipo, boolean>;
  const { data, error } = await supabase.from("preferencias_notificacion").select("tipo, activa");
  if (error || !data) return base;
  for (const row of data as { tipo: string; activa: boolean }[]) {
    if ((NOTIF_TIPOS as readonly string[]).includes(row.tipo)) {
      base[row.tipo as NotifTipo] = row.activa;
    }
  }
  return base;
}

export async function setPreferenciaNotificacion(tipo: NotifTipo, activa: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc("set_preferencia_notificacion", {
    p_tipo: tipo,
    p_activa: activa,
  });
  if (error) return false;
  const row = data as { ok?: boolean } | null;
  return Boolean(row?.ok);
}
