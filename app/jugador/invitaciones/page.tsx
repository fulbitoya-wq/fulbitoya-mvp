"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getInvitacionesPendientes, aceptarInvitacion, rechazarInvitacion } from "@/lib/equipos";
import type { EquipoInvitacion } from "@/lib/types";

type InvitacionConNombre = EquipoInvitacion & { equipo_nombre?: string };

export default function InvitacionesPage() {
  const [invitaciones, setInvitaciones] = useState<InvitacionConNombre[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const list = await getInvitacionesPendientes(user.id);
    setInvitaciones(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAceptar = async (inv: InvitacionConNombre) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setProcessingId(inv.id);
    await aceptarInvitacion(inv.id, user.id);
    setProcessingId(null);
    load();
  };

  const handleRechazar = async (inv: InvitacionConNombre) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setProcessingId(inv.id);
    await rechazarInvitacion(inv.id, user.id);
    setProcessingId(null);
    load();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Invitaciones a equipos
      </h1>
      <p className="mt-2 text-sm text-[#1A2E4A]/70">
        Aceptá o rechazá las invitaciones que te enviaron.
      </p>

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : invitaciones.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-8 text-center">
          <p className="text-[#1A2E4A]/70">No tenés invitaciones pendientes.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {invitaciones.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-2 rounded-xl border border-[#E0E0E0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[#1A2E4A]">
                  Invitación a {inv.equipo_nombre || "un equipo"}
                </p>
                <p className="text-sm text-[#1A2E4A]/70">{inv.invitado_email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={processingId === inv.id}
                  onClick={() => handleAceptar(inv)}
                  className="rounded-lg bg-[var(--fulbito-green)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  disabled={processingId === inv.id}
                  onClick={() => handleRechazar(inv)}
                  className="rounded-lg border border-[#E0E0E0] px-3 py-1.5 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5] disabled:opacity-70"
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
