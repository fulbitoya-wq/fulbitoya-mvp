import { supabase } from "@/lib/supabase";
import { mensajeErrorEquipo } from "@shared/equipos";

export const DIAS_POLITICA = [
  { key: "lun", label: "Lunes" },
  { key: "mar", label: "Martes" },
  { key: "mie", label: "Miércoles" },
  { key: "jue", label: "Jueves" },
  { key: "vie", label: "Viernes" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
] as const;

export type DiaPolitica = (typeof DIAS_POLITICA)[number]["key"];

export type FranjaHoraria = { desde: string; hasta: string };

export type HorariosPolitica = Record<DiaPolitica, FranjaHoraria[]>;

export const HORARIOS_TODO_EL_DIA: HorariosPolitica = {
  lun: [{ desde: "00:00", hasta: "23:59" }],
  mar: [{ desde: "00:00", hasta: "23:59" }],
  mie: [{ desde: "00:00", hasta: "23:59" }],
  jue: [{ desde: "00:00", hasta: "23:59" }],
  vie: [{ desde: "00:00", hasta: "23:59" }],
  sab: [{ desde: "00:00", hasta: "23:59" }],
  dom: [{ desde: "00:00", hasta: "23:59" }],
};

export type PoliticaForm = {
  reserva_sena_nunca_devuelve: boolean;
  reserva_devolucion_total_horas: string;
  reserva_cobro_total_horas: string;
  reserva_descuento_total_pct: string;
  reserva_descuento_total_activo: boolean;
  desafios_habilitados: boolean;
  horarios: HorariosPolitica;
  anticipacion_min_f5_horas: string;
  anticipacion_min_f7_horas: string;
  anticipacion_min_f9_horas: string;
  anticipacion_min_f11_horas: string;
  cierre_sin_rival_mas_24h_horas: string;
  cierre_sin_rival_menos_24h_horas: string;
  permitir_seguir_hasta_inicio: boolean;
  tolerancia_walkover_min: string;
  predio_cancela: "reprogramar" | "devolver_todo";
  sena_amistoso_mas_48: string;
  sena_amistoso_48_24: string;
  sena_amistoso_menos_24: string;
  sena_cancha_mas_48: string;
  sena_cancha_48_24: string;
  sena_cancha_menos_24: string;
};

export const POLITICA_DEFAULTS: PoliticaForm = {
  reserva_sena_nunca_devuelve: false,
  reserva_devolucion_total_horas: "24",
  reserva_cobro_total_horas: "2",
  reserva_descuento_total_pct: "5",
  reserva_descuento_total_activo: true,
  desafios_habilitados: true,
  horarios: HORARIOS_TODO_EL_DIA,
  anticipacion_min_f5_horas: "3",
  anticipacion_min_f7_horas: "3",
  anticipacion_min_f9_horas: "24",
  anticipacion_min_f11_horas: "24",
  cierre_sin_rival_mas_24h_horas: "12",
  cierre_sin_rival_menos_24h_horas: "3",
  permitir_seguir_hasta_inicio: true,
  tolerancia_walkover_min: "15",
  predio_cancela: "devolver_todo",
  sena_amistoso_mas_48: "",
  sena_amistoso_48_24: "",
  sena_amistoso_menos_24: "",
  sena_cancha_mas_48: "",
  sena_cancha_48_24: "",
  sena_cancha_menos_24: "",
};

function numStr(v: unknown, fallback: string): string {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : fallback;
}

function parseHorarios(raw: unknown): HorariosPolitica {
  const base: HorariosPolitica = { ...HORARIOS_TODO_EL_DIA };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const d of DIAS_POLITICA) {
    const arr = obj[d.key];
    if (!Array.isArray(arr) || arr.length === 0) {
      base[d.key] = [];
      continue;
    }
    base[d.key] = arr.map((x) => {
      const row = x as { desde?: string; hasta?: string };
      return { desde: row.desde ?? "00:00", hasta: row.hasta ?? "23:59" };
    });
  }
  return base;
}

export function politicaFromRow(row: Record<string, unknown> | null): PoliticaForm {
  if (!row) return { ...POLITICA_DEFAULTS, horarios: { ...HORARIOS_TODO_EL_DIA } };
  return {
    reserva_sena_nunca_devuelve: Boolean(row.reserva_sena_nunca_devuelve),
    reserva_devolucion_total_horas: numStr(row.reserva_devolucion_total_horas, "24"),
    reserva_cobro_total_horas: numStr(row.reserva_cobro_total_horas, "2"),
    reserva_descuento_total_pct: numStr(row.reserva_descuento_total_pct, "5"),
    reserva_descuento_total_activo: row.reserva_descuento_total_activo !== false,
    desafios_habilitados: row.desafios_habilitados !== false,
    horarios: parseHorarios(row.horarios),
    anticipacion_min_f5_horas: numStr(row.anticipacion_min_f5_horas, "3"),
    anticipacion_min_f7_horas: numStr(row.anticipacion_min_f7_horas, "3"),
    anticipacion_min_f9_horas: numStr(row.anticipacion_min_f9_horas, "24"),
    anticipacion_min_f11_horas: numStr(row.anticipacion_min_f11_horas, "24"),
    cierre_sin_rival_mas_24h_horas: numStr(row.cierre_sin_rival_mas_24h_horas, "12"),
    cierre_sin_rival_menos_24h_horas: numStr(row.cierre_sin_rival_menos_24h_horas, "3"),
    permitir_seguir_hasta_inicio: row.permitir_seguir_hasta_inicio !== false,
    tolerancia_walkover_min: numStr(row.tolerancia_walkover_min, "15"),
    predio_cancela: row.predio_cancela === "reprogramar" ? "reprogramar" : "devolver_todo",
    sena_amistoso_mas_48: numStr(row.sena_amistoso_mas_48, ""),
    sena_amistoso_48_24: numStr(row.sena_amistoso_48_24, ""),
    sena_amistoso_menos_24: numStr(row.sena_amistoso_menos_24, ""),
    sena_cancha_mas_48: numStr(row.sena_cancha_mas_48, ""),
    sena_cancha_48_24: numStr(row.sena_cancha_48_24, ""),
    sena_cancha_menos_24: numStr(row.sena_cancha_menos_24, ""),
  };
}

export function politicaToDatos(
  form: PoliticaForm,
  extra?: { valor_hora?: number; valor_reserva?: number; formato?: string }
): Record<string, unknown> {
  const n = (s: string) => {
    const v = Number(s);
    return Number.isFinite(v) ? v : null;
  };
  return {
    reserva_sena_nunca_devuelve: form.reserva_sena_nunca_devuelve,
    reserva_devolucion_total_horas: n(form.reserva_devolucion_total_horas),
    reserva_cobro_total_horas: n(form.reserva_cobro_total_horas),
    reserva_descuento_total_pct: n(form.reserva_descuento_total_pct),
    reserva_descuento_total_activo: form.reserva_descuento_total_activo,
    desafios_habilitados: form.desafios_habilitados,
    horarios: form.horarios,
    anticipacion_min_f5_horas: n(form.anticipacion_min_f5_horas),
    anticipacion_min_f7_horas: n(form.anticipacion_min_f7_horas),
    anticipacion_min_f9_horas: n(form.anticipacion_min_f9_horas),
    anticipacion_min_f11_horas: n(form.anticipacion_min_f11_horas),
    cierre_sin_rival_mas_24h_horas: n(form.cierre_sin_rival_mas_24h_horas),
    cierre_sin_rival_menos_24h_horas: n(form.cierre_sin_rival_menos_24h_horas),
    permitir_seguir_hasta_inicio: form.permitir_seguir_hasta_inicio,
    tolerancia_walkover_min: n(form.tolerancia_walkover_min),
    predio_cancela: form.predio_cancela,
    sena_amistoso_mas_48: n(form.sena_amistoso_mas_48),
    sena_amistoso_48_24: n(form.sena_amistoso_48_24),
    sena_amistoso_menos_24: n(form.sena_amistoso_menos_24),
    sena_cancha_mas_48: n(form.sena_cancha_mas_48),
    sena_cancha_48_24: n(form.sena_cancha_48_24),
    sena_cancha_menos_24: n(form.sena_cancha_menos_24),
    ...extra,
  };
}

export function textoReservaComun(pol: {
  reserva_sena_nunca_devuelve?: boolean;
  reserva_devolucion_total_horas?: number | string | null;
  reserva_cobro_total_horas?: number | string | null;
} | null): string | null {
  if (!pol) return null;
  if (pol.reserva_sena_nunca_devuelve) {
    return "En las reservas comunes, la seña no se devuelve.";
  }
  const x = Number(pol.reserva_devolucion_total_horas ?? 24);
  const y = Number(pol.reserva_cobro_total_horas ?? 2);
  return `En las reservas de PorLaCancha: con más de ${x} h te devolvemos todo. Dentro de esas horas o si no te presentás, se retiene como máximo la seña. Si pagaste el total, te devolvemos lo que supere la seña.`;
}

export async function cargarPoliticaPredio(
  canchaId: string,
  campoId?: string | null
): Promise<PoliticaForm> {
  if (campoId) {
    const { data } = await supabase
      .from("politica_campo")
      .select("*")
      .eq("campo_id", campoId)
      .maybeSingle();
    if (data) return politicaFromRow(data as Record<string, unknown>);
  }
  const { data } = await supabase
    .from("politica_predio")
    .select("*")
    .eq("cancha_id", canchaId)
    .maybeSingle();
  return politicaFromRow((data as Record<string, unknown>) ?? null);
}

export async function matrizSenaDefault(senaBase: number): Promise<Record<string, number> | null> {
  const { data, error } = await supabase.rpc("plc_matriz_sena_default", {
    p_sena_base: senaBase,
  });
  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const num = (k: string) => Number(row[k] ?? 0);
  return {
    amistoso_mas_48: num("amistoso_mas_48"),
    amistoso_48_24: num("amistoso_48_24"),
    amistoso_menos_24: num("amistoso_menos_24"),
    cancha_mas_48: num("cancha_mas_48"),
    cancha_48_24: num("cancha_48_24"),
    cancha_menos_24: num("cancha_menos_24"),
  };
}

export async function guardarPoliticaPredio(
  canchaId: string,
  campoId: string | null,
  datos: Record<string, unknown>
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("guardar_politica_predio", {
    p_cancha_id: canchaId,
    p_campo_id: campoId,
    p_datos: datos,
  });
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string; maximo?: number; minimo?: number } | null;
  if (!row?.ok) {
    return {
      ok: false,
      error: mensajeErrorEquipo(row?.error, { minimo: row?.minimo }),
    };
  }
  const extras = await supabase.rpc("plc_guardar_extras_reserva", {
    p_cancha_id: canchaId,
    p_campo_id: campoId,
    p_descuento_pct: datos.reserva_descuento_total_pct ?? 5,
    p_descuento_activo: datos.reserva_descuento_total_activo !== false,
  });
  if (extras.error) return { ok: false, error: extras.error.message };
  const extraRow = extras.data as { ok?: boolean; error?: string } | null;
  if (extraRow && extraRow.ok === false) {
    return { ok: false, error: mensajeErrorEquipo(extraRow.error) };
  }
  return { ok: true, error: null };
}

export type SimulacionCondiciones = {
  ok: boolean;
  error?: string;
  mensaje_predio?: string;
  mensaje_equipo?: string;
  mensaje_tramo?: string;
  sena_sin_rival?: number;
  tramo_label?: string;
  periodo_gratis?: boolean;
  cargos_cancelacion?: { tramo: string; cargo: number; label: string }[];
};

export async function simularCondicionesPredio(input: {
  canchaId: string | null;
  campoId: string | null;
  tipo: "por_la_cancha" | "amistoso";
  anticipacionHoras: number;
  datos: Record<string, unknown>;
}): Promise<SimulacionCondiciones> {
  const { data, error } = await supabase.rpc("simular_condiciones_predio", {
    p_cancha_id: input.canchaId,
    p_campo_id: input.campoId,
    p_tipo_desafio: input.tipo,
    p_anticipacion_horas: input.anticipacionHoras,
    p_datos: input.datos,
  });
  if (error) return { ok: false, error: error.message };
  const row = (data ?? {}) as SimulacionCondiciones & { error?: string };
  if (!row.ok) {
    return { ok: false, error: mensajeErrorEquipo(row.error) };
  }
  return row;
}

export function validarPrecioYSena(precio: number, sena: number): string | null {
  if (!Number.isFinite(precio) || precio <= 0) return "El precio de la cancha es obligatorio.";
  if (!Number.isFinite(sena) || sena <= 0) return "La seña es obligatoria.";
  if (sena > precio * 0.5 + 0.009) {
    return "La seña no puede pasar el 50% del precio de la cancha.";
  }
  return null;
}
