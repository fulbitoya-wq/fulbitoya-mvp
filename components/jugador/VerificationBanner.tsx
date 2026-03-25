"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { Usuario, Verification } from "@/lib/types";
import { getVerificationBannerMessage } from "@/lib/verification";

interface VerificationBannerProps {
  usuario: Usuario | null;
  verification: Verification | null;
}

export function VerificationBanner({ usuario, verification }: VerificationBannerProps) {
  const { type, message } = getVerificationBannerMessage(usuario, verification);

  if (type === "none" || !message) return null;

  const styles = {
    pending: "bg-amber-100 border-amber-400 text-amber-900",
    approved: "bg-green-100 border-green-500 text-green-900",
    rejected: "bg-red-100 border-red-500 text-red-900",
  };

  const icons = {
    pending: <AlertTriangle className="h-5 w-5 shrink-0" />,
    approved: <CheckCircle className="h-5 w-5 shrink-0" />,
    rejected: <XCircle className="h-5 w-5 shrink-0" />,
  };

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{message}</p>
          {type === "pending" && (
            <Link
              href="/jugador/verificacion"
              className="mt-1 inline-block text-sm font-semibold underline"
            >
              Verificar mi identidad
            </Link>
          )}
          {type === "rejected" && (
            <Link
              href="/jugador/verificacion"
              className="mt-1 inline-block text-sm font-semibold underline"
            >
              Reenviar documentación
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
