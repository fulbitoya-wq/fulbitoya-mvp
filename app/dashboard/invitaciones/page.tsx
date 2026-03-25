"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getTeamInvitationsForUser,
  acceptTeamInvitation,
  rejectTeamInvitation,
} from "@/lib/equipos";
import type { EquipoInvitacion } from "@/lib/types";

export default function DashboardInvitacionesPage() {
  const [invitaciones, setInvitaciones] = useState<(EquipoInvitacion & { equipo_nombre?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const list = await getTeamInvitationsForUser(user.id);
    setInvitaciones(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAccept = async (inv: EquipoInvitacion & { equipo_nombre?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setProcessingId(inv.id);
    await acceptTeamInvitation(inv.id, user.id);
    setProcessingId(null);
    load();
  };

  const handleReject = async (inv: EquipoInvitacion & { equipo_nombre?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setProcessingId(inv.id);
    await rejectTeamInvitation(inv.id, user.id);
    setProcessingId(null);
    load();
  };

  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
        Invitaciones a equipos
      </h1>
      <p className="mt-1 text-[#1A2E4A]/70">
        Aceptá o rechazá las invitaciones que te enviaron.
      </p>

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : invitaciones.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-8 text-center">
          <p className="text-[#1A2E4A]/70">No tenés invitaciones pendientes.</p>
          <Link href="/jugador" className="mt-4 inline-block font-medium text-[var(--fulbito-green)] hover:underline">
            Ir a mi espacio
          </Link>
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
                  onClick={() => handleAccept(inv)}
                  className="rounded-lg bg-[var(--fulbito-green)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  disabled={processingId === inv.id}
                  onClick={() => handleReject(inv)}
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
