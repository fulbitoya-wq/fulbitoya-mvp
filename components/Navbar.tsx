"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsLoggedIn(Boolean(session?.user));
      setLoadingAuth(false);
    };

    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(Boolean(session?.user));
      setLoadingAuth(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    if (typeof window !== "undefined") window.location.href = "/";
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-[var(--fulbito-navy)] shadow-md">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-24 items-center justify-between">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/images/logo-white.png"
              alt="FulbitoYa!"
              width={200}
              height={56}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/canchas"
              className="text-sm font-medium text-white/90 transition hover:text-white"
            >
              Canchas
            </Link>

            {loadingAuth ? null : isLoggedIn ? (
              <>
                <Link
                  href="/jugador"
                  className="text-sm font-medium text-white/90 transition hover:text-white"
                >
                  Mi panel
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-white/90 transition hover:text-white"
                >
                  Ingresar
                </Link>
                <Link
                  href="/registro"
                  className="rounded-lg bg-[var(--fulbito-green)] px-6 py-3 text-base font-semibold text-white transition hover:bg-[var(--fulbito-green-hover)]"
                >
                  Registrate
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
