import { supabase } from "@/lib/supabase";
import { getCanchasDelOwner } from "@/lib/canchas";
import { getCamposByCancha } from "@/lib/campos";

export type ReservaAgenda = {
  id: string;
  titular_nombre: string | null;
  titular_telefono: string | null;
  canal: string | null;
  cobro_externo: string | null;
  estado_reserva: string | null;
  estado_pago: string | null;
  monto_total: number | null;
  fecha: string;
  hora_inicio: string;
  predio: string;
  campo: string;
};

export async function getReservasDelOwner(ownerId: string): Promise<ReservaAgenda[]> {
  const canchas = await getCanchasDelOwner(ownerId);
  const campos = (
    await Promise.all(canchas.map((c) => getCamposByCancha(c.id)))
  ).flat();
  if (campos.length === 0) return [];

  const campoIds = campos.map((c) => c.id);
  const { data: disps, error: dErr } = await supabase
    .from("disponibilidades")
    .select("id, fecha, hora_inicio, campo_id")
    .in("campo_id", campoIds);
  if (dErr || !disps?.length) return [];

  const dispById = new Map(disps.map((d) => [d.id, d]));
  const campoById = new Map(campos.map((c) => [c.id, c]));
  const canchaById = new Map(canchas.map((c) => [c.id, c]));

  const { data: reservas, error: rErr } = await supabase
    .from("reservas")
    .select(
      "id, titular_nombre, titular_telefono, canal, cobro_externo, estado_reserva, estado_pago, monto_total, disponibilidad_id"
    )
    .in(
      "disponibilidad_id",
      disps.map((d) => d.id)
    )
    .eq("origen", "porlacancha")
    .order("created_at", { ascending: false })
    .limit(80);

  if (rErr || !reservas) return [];

  return reservas
    .map((r) => {
      const d = dispById.get(r.disponibilidad_id as string);
      if (!d) return null;
      const campo = campoById.get(d.campo_id as string);
      const predio = campo ? canchaById.get(campo.cancha_id) : undefined;
      return {
        id: r.id as string,
        titular_nombre: (r.titular_nombre as string | null) ?? null,
        titular_telefono: (r.titular_telefono as string | null) ?? null,
        canal: (r.canal as string | null) ?? null,
        cobro_externo: (r.cobro_externo as string | null) ?? null,
        estado_reserva: (r.estado_reserva as string | null) ?? null,
        estado_pago: (r.estado_pago as string | null) ?? null,
        monto_total: r.monto_total == null ? null : Number(r.monto_total),
        fecha: String(d.fecha),
        hora_inicio: String(d.hora_inicio),
        predio: predio?.nombre ?? "",
        campo: campo?.nombre ?? "",
      } satisfies ReservaAgenda;
    })
    .filter((x): x is ReservaAgenda => x != null);
}
