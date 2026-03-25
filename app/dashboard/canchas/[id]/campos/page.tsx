"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCanchasDelOwner, type Cancha } from "@/lib/canchas";
import { getCamposByCancha, type Campo } from "@/lib/campos";

export default function CanchaCamposPage() {
  const params = useParams();
  const router = useRouter();
  const canchaId = params.id as string;

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [cargando, setCargando] = useState(true);
  const [canchasError, setCanchasError] = useState<string | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);

  useEffect(() => {
    const load = async () => {
      setCargando(true);
      setCanchasError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanchasError("Debés estar logueado.");
        setCargando(false);
        return;
      }

      // Validamos que pertenezca al owner (por seguridad y porque usamos RLS).
      const ownerCanchas = await getCanchasDelOwner(user.id);
      const found = ownerCanchas.find((c) => c.id === canchaId) ?? null;

      if (!found) {
        setCanchasError("No encontré el complejo o no tenés permisos.");
        setCancha(null);
        setCampos([]);
        setCargando(false);
        return;
      }

      setCancha(found);
      const camposRows = await getCamposByCancha(canchaId);
      setCampos(camposRows);
      setCargando(false);
    };

    load();
  }, [canchaId]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/canchas"
          className="text-sm font-medium text-[#1A2E4A]/70 hover:underline"
        >
          ← Volver a mis canchas
        </Link>
        {cancha && (
          <button
            type="button"
            onClick={() => router.push(`/dashboard/canchas/${cancha.id}/campos/crear`)}
            className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5]"
          >
            Nuevo campo
          </button>
        )}
      </div>

      <h1 className="mt-4 font-subheading text-2xl font-semibold text-[#1A2E4A]">
        {cargando ? "Cargando..." : cancha?.nombre ?? "Complejo"}
      </h1>

      {canchasError && (
        <p className="mt-3 text-sm text-red-700">{canchasError}</p>
      )}

      {cargando ? (
        <p className="mt-4 text-[#1A2E4A]/70">Obteniendo campos...</p>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-[#1A2E4A]/70">
            Campos: {campos.length}
          </p>

          {campos.length === 0 ? (
            <div className="rounded-xl border border-[#E0E0E0] bg-white p-6 text-center">
              <p className="text-[#1A2E4A]/70">Todavía no cargaste campos en este complejo.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {campos.map((campo) => (
                <li key={campo.id} className="rounded-xl border border-[#E0E0E0] bg-white p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {campo.foto_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={campo.foto_url}
                          alt={`Foto del campo ${campo.nombre}`}
                          className="mt-1 h-16 w-16 shrink-0 rounded-lg border border-[#E0E0E0] object-cover"
                        />
                      )}
                      <p className="truncate font-semibold text-[#1A2E4A]">{campo.nombre}</p>
                      <p className="text-sm text-[#1A2E4A]/70">
                        Tipo: {campo.tipo ?? "—"} - Superficie: {campo.superficie ?? "—"}
                      </p>
                      <p className="text-sm text-[#1A2E4A]/70">
                        Precio/hora: ${Number(campo.valor_hora ?? 0).toLocaleString("es-AR")} · Reserva: ${Number(campo.valor_reserva ?? 0).toLocaleString("es-AR")}
                      </p>
                      {(campo.luz || campo.camaras || campo.minutero || campo.marcador_gol) && (
                        <p className="mt-1 text-xs text-[#1A2E4A]/60">
                          {[
                            campo.luz ? "Luz" : null,
                            campo.camaras ? "Cámaras" : null,
                            campo.minutero ? "Minutero" : null,
                            campo.marcador_gol ? "Marcador" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

