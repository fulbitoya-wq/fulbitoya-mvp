"use client";

import Link from "next/link";
import { Users, List, Swords, User, CalendarPlus, Coins, Lock } from "lucide-react";
import type { Usuario, Verification } from "@/lib/types";
import { isIdentityVerified } from "@/lib/verification";

interface DashboardMenuProps {
  usuario: Usuario | null;
  verification: Verification | null;
}

export function DashboardMenu({ usuario, verification }: DashboardMenuProps) {
  const verified = isIdentityVerified(usuario, verification);

  const alwaysAllowed = [
    { href: "/jugador/equipos/crear", label: "Crear equipo", icon: Users },
    { href: "/jugador/equipos", label: "Ver equipos", icon: List },
    { href: "/jugador/desafios", label: "Ver desafíos abiertos", icon: Swords },
    { href: "/jugador/perfil", label: "Mi perfil", icon: User },
  ];

  const blockedUntilVerified = [
    { label: "Crear desafío / evento", icon: CalendarPlus },
    { label: "Apostar / partidas con stake", icon: Coins },
  ];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {alwaysAllowed.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col rounded-lg border-2 border-[var(--fulbito-navy)] bg-white p-6 transition hover:bg-[var(--fulbito-navy)] hover:text-white"
          >
            <Icon className="h-6 w-6" />
            <span className="mt-2 font-subheading text-lg font-semibold">{item.label}</span>
            <span className="mt-1 text-sm opacity-90">Disponible</span>
          </Link>
        );
      })}

      {blockedUntilVerified.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex flex-col rounded-lg border-2 border-gray-300 bg-gray-50 p-6 opacity-80"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-500" />
              <Icon className="h-6 w-6 text-gray-500" />
            </div>
            <span className="mt-2 font-subheading text-lg font-semibold text-gray-600">{item.label}</span>
            <span className="mt-1 text-sm text-gray-500">
              {verified ? "Disponible" : "Verificá tu identidad para desbloquear"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
