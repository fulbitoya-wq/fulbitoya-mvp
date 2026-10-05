"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDesafiosDelOwner } from "@/lib/desafios";
import { MATCH_TIPO_LABEL } from "@/lib/google-maps";
import type { Desafio } from "@/lib/types";

export default function DashboardDesafiosPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Desafio[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reload = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Debés estar logueado.");
        setLoading(false);
        return;
      }
      setRows(await getDesafiosDelOwner(user.id));
      setLoading(false);
    };
    void reload();
  }, []);

  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Partidos en tus canchas</h1>
      <p className="mt-1 max-w-xl text-[#1A2E4A]/70">
        Ya no se publican desafíos por plata desde acá. Los jugadores arman el partido en PorLaCancha sobre un
        horario tuyo. Esta lista es histórica, por si quedó algo viejo.
      </p>

      <div className="mt-8">
        {loading ? (
          <p className="text-[#1A2E4A]/70">Cargando...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-[#E0E0E0] bg-white p-6 text-[#1A2E4A]/70">
            No hay partidos viejos cargados desde este panel.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((d) => (
              <li key={d.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
                <p className="font-semibold text-[#1A2E4A]">{d.titulo}</p>
                <p className="text-sm text-[#1A2E4A]/70">
                  {MATCH_TIPO_LABEL[d.tipo]} · {d.fecha} · {d.hora_inicio.slice(0, 5)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-[#1A2E4A]/50">{d.estado}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
