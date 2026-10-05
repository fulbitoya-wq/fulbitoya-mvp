"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const items: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/canchas", label: "Predios" },
  { href: "/dashboard/disponibilidades", label: "Agenda" },
  { href: "/dashboard/reservas", label: "Reservas" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const go = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      setReady(true);
    };
    void go();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] text-sm text-[#1A2E4A]/70">
        Cargando el panel…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 bg-[#1A2E4A] text-white">
        <div className="p-4">
          <Link href="/dashboard" className="font-heading text-xl">
            FulbitoYa
          </Link>
          <p className="mt-1 text-xs text-white/60">Panel del predio</p>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 px-4 text-xs leading-relaxed text-white/50">
          Los jugadores reservan y arman partidos en PorLaCancha. Acá cargás horarios, cobrás y ves la agenda.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mx-3 mt-6 block rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-[#2C4A72]"
        >
          Cerrar sesión
        </button>
      </aside>
      <div className="flex-1 bg-[#F5F5F5]">{children}</div>
    </div>
  );
}
