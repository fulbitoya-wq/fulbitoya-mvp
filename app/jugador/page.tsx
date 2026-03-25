"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUsuario, getVerification } from "@/lib/verification";
import { getEquiposDelUsuario } from "@/lib/equipos";
import { getTeamInvitationsForUser } from "@/lib/equipos";
import type { Usuario, Verification } from "@/lib/types";
import { VerificationBanner } from "@/components/jugador/VerificationBanner";
import { DashboardMenu } from "@/components/jugador/DashboardMenu";

export default function JugadorPage() {
  const [nombre, setNombre] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [equiposCount, setEquiposCount] = useState(0);
  const [invitacionesCount, setInvitacionesCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (user.user_metadata?.nombre) setNombre(user.user_metadata.nombre);
      else if (user.email) setNombre(user.email.split("@")[0]);

      const [u, v, equipos, invitaciones] = await Promise.all([
        getUsuario(user.id),
        getVerification(user.id),
        getEquiposDelUsuario(user.id),
        getTeamInvitationsForUser(user.id),
      ]);
      setUsuario(u);
      setVerification(v);
      setEquiposCount(equipos.length);
      setInvitacionesCount(invitaciones.length);
    };
    load();
  }, []);

  const isUnverified = usuario?.verification_level === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-[#E0E0E0] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
              {nombre ? `Hola, ${nombre}` : "Tu espacio"}
            </h1>
            <p className="mt-2 text-[#1A2E4A]/70">
              Acá podés ver tus reservas, equipos y gestionar tu perfil.
            </p>
          </div>
          {isUnverified && (
            <span className="inline-flex items-center rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
              Cuenta no verificada
            </span>
          )}
        </div>

        <div className="mt-6">
          <VerificationBanner usuario={usuario} verification={verification} />
        </div>

        <DashboardMenu usuario={usuario} verification={verification} />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/jugador/perfil"
          className="rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm transition hover:border-[var(--fulbito-green)] hover:shadow-md"
        >
          <h3 className="font-subheading text-lg font-semibold text-[#1A2E4A]">Perfil</h3>
          <p className="mt-1 text-sm text-[#1A2E4A]/70">Ver y editar tu perfil.</p>
        </Link>
        <Link
          href="/jugador/equipos"
          className="rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm transition hover:border-[var(--fulbito-green)] hover:shadow-md"
        >
          <h3 className="font-subheading text-lg font-semibold text-[#1A2E4A]">Mis equipos</h3>
          <p className="mt-1 text-sm text-[#1A2E4A]/70">
            {equiposCount === 0 ? "Aún no tenés equipos." : `${equiposCount} equipo(s).`}
          </p>
        </Link>
        <Link
          href="/dashboard/invitaciones"
          className="rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm transition hover:border-[var(--fulbito-green)] hover:shadow-md"
        >
          <h3 className="font-subheading text-lg font-semibold text-[#1A2E4A]">Invitaciones</h3>
          <p className="mt-1 text-sm text-[#1A2E4A]/70">
            {invitacionesCount === 0 ? "Sin invitaciones pendientes." : `${invitacionesCount} pendiente(s).`}
          </p>
        </Link>
        <Link
          href="/jugador/verificacion"
          className="rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm transition hover:border-[var(--fulbito-green)] hover:shadow-md"
        >
          <h3 className="font-subheading text-lg font-semibold text-[#1A2E4A]">Verificación</h3>
          <p className="mt-1 text-sm text-[#1A2E4A]/70">
            {isUnverified ? "Cuenta no verificada" : "Estado de verificación"}
          </p>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/canchas"
          className="flex flex-col rounded-lg border-2 border-[#1A2E4A] bg-white p-6 transition hover:bg-[#1A2E4A] hover:text-white"
        >
          <span className="font-subheading text-lg font-semibold">Buscar cancha</span>
          <span className="mt-1 text-sm opacity-90">Encontrá turnos y reservá.</span>
        </Link>
        <Link
          href="/jugador/reservas"
          className="flex flex-col rounded-lg border-2 border-[#4CAF50] bg-white p-6 transition hover:bg-[#4CAF50] hover:text-white"
        >
          <span className="font-subheading text-lg font-semibold">Mis reservas</span>
          <span className="mt-1 text-sm opacity-90">Ver y gestionar tus reservas.</span>
        </Link>
      </div>
    </div>
  );
}
