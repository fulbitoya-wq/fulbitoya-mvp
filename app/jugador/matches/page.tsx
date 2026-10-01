"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getMatchCapacity, getMyMatches } from "@/lib/matches";
import type { Match } from "@/lib/types";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const rows = await getMyMatches(user.id);
      setMatches(rows);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">Mis matches</h1>
        <Link
          href="/jugador/matches/crear"
          className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--fulbito-green-hover)]"
        >
          Crear match
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : matches.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-8 text-center">
          <p className="text-[#1A2E4A]/70">Todavía no tenés matches.</p>
          <Link href="/jugador/matches/crear" className="mt-4 inline-block font-medium text-[var(--fulbito-green)] hover:underline">
            Crear mi primer match
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/jugador/matches/${m.id}`}
                className="block rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-sm transition hover:border-[#1A2E4A]/25 hover:shadow-md"
              >
                <p className="text-sm text-[#1A2E4A]/70">{m.fecha} - {m.hora_inicio}</p>
                <h2 className="mt-1 text-lg font-semibold text-[#1A2E4A]">{m.tipo.toUpperCase()}</h2>
                <p className="mt-1 text-sm text-[#1A2E4A]/70">Estado: {m.estado}</p>
                <p className="text-sm text-[#1A2E4A]/70">Visibilidad: {m.visibilidad}</p>
                <p className="mt-2 text-xs text-[#1A2E4A]/60">Capacidad sugerida: {getMatchCapacity(m.tipo)} jugadores</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
