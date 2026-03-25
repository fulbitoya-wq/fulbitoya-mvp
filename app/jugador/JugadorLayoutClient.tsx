"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { JugadorNavbar } from "@/components/JugadorNavbar";

export function JugadorLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    };

    checkSession();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
        <p className="text-[#1A2E4A]/70">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      <JugadorNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
