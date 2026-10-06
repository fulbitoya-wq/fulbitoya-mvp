"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCanchasDelOwner, type Cancha } from "@/lib/canchas";
import { claseEstadoPredio, etiquetaEstadoPredio } from "@/lib/predios";

export default function DashboardCanchasPage() {
  const [loading, setLoading] = useState(true);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
      setCanchas(await getCanchasDelOwner(user.id));
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Mis predios</h1>
      <p className="mt-1 text-sm text-[#1A2E4A]/70 sm:text-base">
        Cargá el predio, mandalo a revisión y, cuando lo aprueben, los jugadores lo ven en PorLaCancha.
      </p>

      <div className="mt-6">
        <Link
          href="/dashboard/canchas/crear"
          className="inline-flex rounded-lg bg-[var(--fulbito-green)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Cargar predio
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-[#1A2E4A]/70">Cargando predios…</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : canchas.length === 0 ? (
          <div className="rounded-xl border border-[#E0E0E0] bg-white p-6 text-center">
            <p className="text-[#1A2E4A]/70">Todavía no cargaste un predio.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {canchas.map((c) => (
              <li key={c.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[#1A2E4A]">{c.nombre}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${claseEstadoPredio(c.estado)}`}>
                        {etiquetaEstadoPredio(c.estado)}
                      </span>
                    </div>
                    {c.barrio ? <p className="text-sm text-[#1A2E4A]/70">{c.barrio}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/canchas/${c.id}/editar`}
                      className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#1A2E4A]"
                    >
                      Completar / editar
                    </Link>
                    <Link
                      href={`/dashboard/canchas/${c.id}/campos`}
                      className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#1A2E4A]"
                    >
                      Canchas
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
