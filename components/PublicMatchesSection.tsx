"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PublicMatchCard } from "@/lib/matches";

interface PublicMatchesSectionProps {
  matches: PublicMatchCard[];
}

export function PublicMatchesSection({ matches }: PublicMatchesSectionProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [joinedMatchIds, setJoinedMatchIds] = useState<Set<string>>(new Set());

  const matchIds = useMemo(() => matches.map((m) => m.id), [matches]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoggedIn(false);
        setJoinedMatchIds(new Set());
        return;
      }

      setIsLoggedIn(true);
      if (!matchIds.length) return;

      const { data } = await supabase
        .from("match_players")
        .select("match_id, estado")
        .eq("user_id", user.id)
        .in("match_id", matchIds);

      const joined = new Set(
        (data ?? [])
          .filter((row) => row.estado !== "rechazado")
          .map((row) => row.match_id as string)
      );
      setJoinedMatchIds(joined);
    };
    load();
  }, [matchIds]);

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-3xl tracking-wide text-[#1A2E4A] sm:text-4xl">Encontrá tu partido</h2>
          <p className="mt-2 text-[#1A2E4A]/80">Matches públicos para sumarte. Para unirte, iniciá sesión.</p>
        </div>
        <Link href="/jugador/matches" className="text-sm font-medium text-[var(--fulbito-green)] hover:underline">
          Ver todos
        </Link>
      </div>

      {matches.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => {
            const alreadyInMatch = joinedMatchIds.has(m.id);
            const href = isLoggedIn
              ? `/jugador/matches/${m.id}`
              : `/login?next=${encodeURIComponent(`/jugador/matches/${m.id}`)}`;
            const cta = alreadyInMatch ? "Ya participás" : "Unirme";

            return (
              <Link
                key={m.id}
                href={href}
                className="rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-sm transition hover:border-[var(--fulbito-green)] hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-subheading text-lg font-semibold text-[#1A2E4A]">{m.tipo.toUpperCase()}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {m.estado}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#1A2E4A]/75">
                  {m.fecha} - {m.hora_inicio.slice(0, 5)}
                </p>
                <p className="mt-1 text-sm text-[#1A2E4A]/75">Duración: {m.duracion_min} min</p>
                <p className="mt-1 text-sm text-[#1A2E4A]/75">Zona: {m.zona}</p>
                <span
                  className={`mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white ${
                    alreadyInMatch ? "bg-[#1A2E4A]" : "bg-[var(--fulbito-green)]"
                  }`}
                >
                  {cta}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-[#E0E0E0] bg-white p-6 text-sm text-[#1A2E4A]/70">
          Todavía no hay matches públicos creados.
        </div>
      )}
    </section>
  );
}
