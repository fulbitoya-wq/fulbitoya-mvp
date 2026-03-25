"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getVerification } from "@/lib/verification";
import type { Verification } from "@/lib/types";
import { VERIFICATION_STATUS_LABELS } from "@/lib/types";

export default function VerificacionPage() {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const v = await getVerification(user.id);
      setVerification(v);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver al inicio
      </Link>
      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Verificación de identidad
      </h1>
      <p className="mt-2 text-sm text-[#1A2E4A]/70">
        Para crear desafíos y participar en partidas con apuesta necesitás verificar tu identidad.
      </p>

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : (
        <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
          {verification ? (
            <div>
              <p className="font-medium text-[#1A2E4A]">
                Estado: {VERIFICATION_STATUS_LABELS[verification.status as keyof typeof VERIFICATION_STATUS_LABELS]}
              </p>
              <p className="mt-2 text-sm text-[#1A2E4A]/70">
                {verification.status === "pending" &&
                  "Tu documentación está en revisión. Te avisaremos cuando sea aprobada."}
                {verification.status === "approved" && "Tu identidad está verificada."}
                {verification.status === "rejected" &&
                  "Tu verificación fue rechazada. Podés reenviar documentación más abajo."}
              </p>
              {verification.status !== "approved" && (
                <p className="mt-4 text-sm text-[#1A2E4A]/60">
                  Próximamente: subida de DNI (frente/dorso) y selfie. Por ahora el proceso se hace por soporte.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[#1A2E4A]/80">
                Aún no enviaste documentación para verificar tu identidad.
              </p>
              <p className="mt-4 text-sm text-[#1A2E4A]/60">
                Próximamente: formulario para subir DNI (frente/dorso) y selfie. Por ahora contactá a soporte para iniciar la verificación.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
