// Client component: necesitamos auth.getUser() para cargar las canchas del owner.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCanchasDelOwner, type Cancha } from "@/lib/canchas";

export default function DashboardCanchasPage() {
  const [loading, setLoading] = useState(true);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Debés estar logueado.");
        setLoading(false);
        return;
      }

      const rows = await getCanchasDelOwner(user.id);
      setCanchas(rows);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
        Mis canchas
      </h1>
      <p className="mt-1 text-[#1A2E4A]/70">
        Listado, nueva cancha, editar — en construcción.
      </p>

      <div className="mt-6">
        <a
          href="/dashboard/canchas/crear"
          className="inline-flex rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--fulbito-green-hover)]"
        >
          Crear cancha
        </a>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-[#1A2E4A]/70">Cargando canchas...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : canchas.length === 0 ? (
          <div className="rounded-xl border border-[#E0E0E0] bg-white p-6 text-center">
            <p className="text-[#1A2E4A]/70">Todavía no cargaste canchas.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {canchas.map((c) => (
              <li key={c.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#1A2E4A]">{c.nombre}</p>
                    {c.barrio && <p className="text-sm text-[#1A2E4A]/70">{c.barrio}</p>}
                    {c.activa ? null : <p className="text-xs text-gray-500">No activa</p>}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/canchas/${c.id}/editar`}
                      className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/dashboard/canchas/${c.id}/campos`}
                      className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
                    >
                      Ver campos
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
