"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getDesafiosDelOwner, updateDesafioEstado } from "@/lib/desafios";
import { formatPremioArs, MATCH_TIPO_LABEL } from "@/lib/google-maps";
import type { Desafio } from "@/lib/types";

export default function DashboardDesafiosPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Desafio[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setError(null);
    setLoading(true);
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

  useEffect(() => {
    reload();
  }, []);

  const cancelar = async (id: string) => {
    const { ok, error: err } = await updateDesafioEstado(id, "cancelado");
    if (!ok) {
      setError(err);
      return;
    }
    reload();
  };

  return (
    <div className="p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Desafíos</h1>
          <p className="mt-1 text-[#1A2E4A]/70">Partidos por plata que se muestran en el mapa público.</p>
        </div>
        <Link
          href="/dashboard/desafios/crear"
          className="inline-flex rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fulbito-green-hover)]"
        >
          Crear desafío
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-[#1A2E4A]/70">Cargando...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-[#E0E0E0] bg-white p-6 text-center text-[#1A2E4A]/70">
            Todavía no creaste desafíos.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((d) => (
              <li key={d.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#1A2E4A]">{d.titulo}</p>
                    <p className="text-sm text-[#1A2E4A]/70">
                      {MATCH_TIPO_LABEL[d.tipo]} · {d.fecha} · {d.hora_inicio.slice(0, 5)} · {formatPremioArs(Number(d.premio))}
                    </p>
                    <p className="text-sm text-[#1A2E4A]/70">{d.direccion}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[#1A2E4A]/50">{d.estado}</p>
                  </div>
                  {d.estado === "abierto" && (
                    <button
                      type="button"
                      onClick={() => cancelar(d.id)}
                      className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5]"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
