"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getReservasDelOwner, type ReservaAgenda } from "@/lib/reservas-owner";

function etiquetaCanal(r: ReservaAgenda) {
  if (r.cobro_externo === "sena_fuera") return "Seña cobrada por fuera";
  if (r.cobro_externo === "a_cobrar_predio") return "A cobrar en el predio";
  if (r.canal === "whatsapp") return "Enlace de WhatsApp";
  if (r.canal === "manual") return "Carga manual";
  return "PorLaCancha";
}

export default function DashboardReservasPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReservaAgenda[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Debés estar logueado.");
        setLoading(false);
        return;
      }
      setRows(await getReservasDelOwner(user.id));
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Reservas</h1>
      <p className="mt-1 text-[#1A2E4A]/70">
        Turnos tomados en tus canchas. El detalle de cada día también está en Agenda.
      </p>

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : error ? (
        <p className="mt-6 text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-[#1A2E4A]/70">Todavía no hay reservas de PorLaCancha en tus horarios.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
              <p className="font-medium text-[#1A2E4A]">
                {r.predio} · {r.campo}
              </p>
              <p className="text-sm text-[#1A2E4A]/70">
                {r.fecha} · {r.hora_inicio.slice(0, 5)} · {r.titular_nombre || "Sin nombre"} · {etiquetaCanal(r)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[#1A2E4A]/50">
                {r.estado_reserva ?? "—"} · {r.estado_pago ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
