"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  disponibilidadId: string;
  /** Precio del turno (solo informativo en la ficha; la seña la toma el servidor desde el campo). */
  precio?: number;
  label?: string;
};

export default function ReservarSlotButton({
  disponibilidadId,
  precio,
  label = "Pagar seña",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "pendingReservation",
            JSON.stringify({
              disponibilidadId,
              ts: Date.now(),
            })
          );
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}&intent=reservar`;
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (typeof window !== "undefined") {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}&intent=reservar`;
        }
        return;
      }

      const res = await fetch("/api/pagos/mercadopago/preferencia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ disponibilidadId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?next=${next}&intent=reservar`;
          }
          return;
        }
        setMessage(typeof data.error === "string" ? data.error : "No se pudo abrir Mercado Pago.");
        return;
      }

      const url = data.init_point as string | undefined;
      if (url) {
        window.location.href = url;
        return;
      }

      setMessage("Mercado Pago no devolvió la URL de pago. Revisá la consola o la configuración.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {precio != null && precio >= 0 && (
        <span className="text-[10px] text-[#1A2E4A]/50">
          Turno: {precio.toLocaleString("es-AR")}
        </span>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="rounded-full bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
        >
          {loading ? "Abriendo pago..." : label}
        </button>
      </div>
      {message && (
        <span className="max-w-[220px] text-center text-xs text-red-700">{message}</span>
      )}
    </div>
  );
}
