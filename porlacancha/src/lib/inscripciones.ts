import {
  mensajeErrorEquipo,
  rpcCancelarInscripcion,
  rpcEditarConvocados,
  rpcInscribirEquipo,
} from "@shared/equipos";
import { supabase } from "./supabase";

export type InscripcionMia = {
  id: string;
  desafioId: string;
  equipoId: string;
  estado: string;
  convocados: string[];
};

export async function getInscripcionMia(desafioId: string, equipoIds: string[]): Promise<InscripcionMia | null> {
  if (equipoIds.length === 0) return null;
  const { data, error } = await supabase
    .from("desafio_inscripciones")
    .select("id, desafio_id, equipo_id, estado")
    .eq("desafio_id", desafioId)
    .in("equipo_id", equipoIds)
    .in("estado", ["confirmada", "pendiente_pago"])
    .limit(1);
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  const { data: conv } = await supabase
    .from("desafio_convocados")
    .select("usuario_id")
    .eq("inscripcion_id", row.id);
  return {
    id: row.id,
    desafioId: row.desafio_id,
    equipoId: row.equipo_id,
    estado: row.estado,
    convocados: (conv ?? []).map((c) => String((c as { usuario_id: string }).usuario_id)),
  };
}

export function textoErrorInscripcion(res: { error: string; quienes?: string; minimo?: number }): string {
  return mensajeErrorEquipo(res.error, { quienes: res.quienes, minimo: res.minimo });
}

export async function inscribirEquipo(desafioId: string, equipoId: string, convocados: string[]) {
  const res = await rpcInscribirEquipo(supabase, desafioId, equipoId, convocados);
  if (!res.ok) return { ok: false as const, error: textoErrorInscripcion(res) };
  return { ok: true as const, inscripcionId: res.inscripcion_id, estado: res.estado };
}

export async function guardarConvocados(inscripcionId: string, convocados: string[]) {
  const res = await rpcEditarConvocados(supabase, inscripcionId, convocados);
  if (!res.ok) return { ok: false as const, error: textoErrorInscripcion(res) };
  return { ok: true as const };
}

export async function cancelarInscripcion(inscripcionId: string) {
  const res = await rpcCancelarInscripcion(supabase, inscripcionId);
  if (!res.ok) return { ok: false as const, error: textoErrorInscripcion(res) };
  return { ok: true as const };
}
