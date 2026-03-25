import { supabase } from "@/lib/supabase";

export type IniciarReservaSenaResult =
  | { ok: true; reservaId: string; montoSena: number }
  | { ok: false; error: string };

/** Crea reserva pendiente con monto = valor_reserva del campo (RPC segura). El turno sigue disponible hasta el webhook de MP. */
export async function iniciarReservaSena(disponibilidadId: string): Promise<IniciarReservaSenaResult> {
  const { data, error } = await supabase.rpc("iniciar_reserva_sena", {
    p_disponibilidad_id: disponibilidadId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = data as {
    ok?: boolean;
    error?: string;
    reserva_id?: string;
    monto_sena?: number;
  } | null;

  if (!row?.ok) {
    const code = row?.error ?? "no_se_pudo_iniciar";
    const messages: Record<string, string> = {
      no_auth: "Debés iniciar sesión.",
      turno_no_existe: "Ese horario ya no existe.",
      turno_no_disponible: "Ese horario ya no está disponible.",
      pago_en_curso: "Ya hay un pago en curso para este horario. Esperá unos minutos o probá otro turno.",
      senia_no_configurada: "El dueño no configuró la seña del campo. Contactalo antes de reservar.",
    };
    return { ok: false, error: messages[code] ?? code };
  }

  if (!row.reserva_id) {
    return { ok: false, error: "No se pudo crear la reserva." };
  }

  return {
    ok: true,
    reservaId: row.reserva_id,
    montoSena: Number(row.monto_sena ?? 0),
  };
}

/**
 * @deprecated Usar iniciarReservaSena + Mercado Pago
 */
export async function reservarDisponibilidad(
  disponibilidadId: string,
  precio: number
): Promise<{ reservaId: string | null; error: string | null }> {
  void precio;
  const r = await iniciarReservaSena(disponibilidadId);
  if (!r.ok) return { reservaId: null, error: r.error };
  return { reservaId: r.reservaId, error: null };
}
