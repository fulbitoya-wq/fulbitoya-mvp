"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUsuario } from "@/lib/verification";
import type { Usuario } from "@/lib/types";
import { VERIFICATION_LEVEL_LABELS } from "@/lib/types";

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const u = await getUsuario(user.id);
      setUsuario(u);
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Mi perfil
      </h1>

      <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {usuario ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-[#1A2E4A]/70">Nombre</dt>
              <dd className="text-[#1A2E4A]">{usuario.nombre || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[#1A2E4A]/70">Email</dt>
              <dd className="text-[#1A2E4A]">{usuario.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[#1A2E4A]/70">Teléfono</dt>
              <dd className="text-[#1A2E4A]">{usuario.telefono || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[#1A2E4A]/70">Nivel de verificación</dt>
              <dd className="text-[#1A2E4A]">
                {VERIFICATION_LEVEL_LABELS[usuario.verification_level as 0 | 1 | 2]}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-[#1A2E4A]/70">Cargando...</p>
        )}
        <Link
          href="/jugador/verificacion"
          className="mt-4 inline-block text-sm font-medium text-[var(--fulbito-green)] hover:underline"
        >
          Verificación de identidad →
        </Link>
      </div>
    </div>
  );
}
