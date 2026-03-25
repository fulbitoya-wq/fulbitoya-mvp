"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getEquiposDelUsuario } from "@/lib/equipos";
import type { EquipoConRol } from "@/lib/equipos";

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<EquipoConRol[]>([]);
  const [loading, setLoading] = useState(true);

  const tipoTexto: Record<number, string> = {
    5: "Fútbol 5",
    7: "Fútbol 7",
    11: "Fútbol 11",
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const list = await getEquiposDelUsuario(user.id);
      setEquipos(list);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
          Mis equipos
        </h1>
        <Link
          href="/jugador/equipos/crear"
          className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--fulbito-green-hover)]"
        >
          Crear equipo
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : equipos.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-8 text-center">
          <p className="text-[#1A2E4A]/70">Aún no formás parte de ningún equipo.</p>
          <Link
            href="/jugador/equipos/crear"
            className="mt-4 inline-block font-medium text-[var(--fulbito-green)] hover:underline"
          >
            Crear mi primer equipo
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipos.map(({ equipo, role }) => {
            const isCaptain = role === "captain";
            const logoUrl = (equipo as any).logo_url ?? equipo.uniforme_imagen_url;
            const tipoTextoValue = equipo.tipo_equipo ? tipoTexto[equipo.tipo_equipo] : undefined;
            return (
              <li key={equipo.id}>
                <Link
                  href={`/jugador/equipos/${equipo.id}`}
                  className={`block rounded-xl border p-6 shadow-sm transition ${
                    isCaptain
                      ? "border-[var(--fulbito-green)] bg-[var(--fulbito-green)]/5 hover:bg-[var(--fulbito-green)]/10 hover:shadow-md"
                      : "border-[#E0E0E0] bg-white hover:border-[#1A2E4A]/20 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#1A2E4A]/50 overflow-hidden">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt={`Logo del equipo ${equipo.nombre}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold">?</span>
                        )}
                      </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-subheading text-lg font-semibold text-[#1A2E4A]">
                        {equipo.nombre}
                      </h2>
                      {equipo.ciudad && (
                        <p className="mt-1 text-sm text-[#1A2E4A]/70">{equipo.ciudad}</p>
                      )}
                      {tipoTextoValue && (
                        <p className="mt-1 text-xs text-[#1A2E4A]/70">Tipo: {tipoTextoValue}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-[#1A2E4A]/70">Uniforme:</span>
                        <div className="flex items-center gap-2">
                          {equipo.color_primario && (
                            <span
                              className="h-6 w-6 rounded-full border"
                              style={{ backgroundColor: equipo.color_primario }}
                              aria-label="Color principal"
                            />
                          )}
                          {equipo.color_secundario && (
                            <span
                              className="h-6 w-6 rounded-full border"
                              style={{ backgroundColor: equipo.color_secundario }}
                              aria-label="Color secundario"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                        isCaptain
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[#E0E0E0] text-[#1A2E4A]/80"
                      }`}
                    >
                      {isCaptain ? "Capitán" : "Jugador"}
                    </span>
                  </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
