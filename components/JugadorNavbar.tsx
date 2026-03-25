"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function JugadorNavbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b border-[#E0E0E0] bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/jugador"
          className="font-heading text-2xl tracking-wide text-[#1A2E4A]"
        >
          FulbitoYa!
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/canchas"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Canchas
          </Link>
          <Link
            href="/jugador"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Mi espacio
          </Link>
          <Link
            href="/jugador/reservas"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Mis reservas
          </Link>
          <Link
            href="/jugador/equipos"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Equipos
          </Link>
          <Link
            href="/jugador/invitaciones"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Invitaciones
          </Link>
          <Link
            href="/jugador/desafios"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Desafíos
          </Link>
          <Link
            href="/jugador/perfil"
            className="text-sm font-medium text-[#1A2E4A]/80 transition hover:text-[#1A2E4A]"
          >
            Mi perfil
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[#E0E0E0] px-4 py-2 text-sm font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
    </header>
  );
}
