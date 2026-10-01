"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { DesafiosPriceMap } from "@/components/maps/DesafiosPriceMap";
import { getDesafiosPublicos } from "@/lib/desafios";
import { formatPremioArs, MATCH_TIPO_LABEL } from "@/lib/google-maps";
import type { Desafio } from "@/lib/types";

function horaCorta(v: string) {
  return v.slice(0, 5);
}

export function DesafiosExplore() {
  const [items, setItems] = useState<Desafio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: rows, error: loadError } = await getDesafiosPublicos();
      setItems(rows);
      setError(loadError);
      setSelectedId(rows[0]?.id ?? null);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const pins = useMemo(
    () =>
      items.map((d) => ({
        id: d.id,
        lat: Number(d.lat),
        lng: Number(d.lng),
        premio: Number(d.premio),
        titulo: d.titulo,
      })),
    [items]
  );

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col lg:flex-row">
      <div className="w-full overflow-y-auto border-b border-[#E0E0E0] bg-white lg:w-[42%] lg:border-b-0 lg:border-r">
        <div className="px-5 py-6 sm:px-6">
          <h1 className="font-heading text-3xl tracking-wide text-[#1A2E4A]">Desafíos</h1>
          <p className="mt-1 text-sm text-[#1A2E4A]/70">
            Partidos por plata. Tocá un pin del mapa o una card, como en Airbnb.
          </p>

          {loading ? (
            <p className="mt-8 text-[#1A2E4A]/70">Cargando desafíos...</p>
          ) : error ? (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              No se pudieron cargar los desafíos. Si restauraste Supabase recién, corré la migración{" "}
              <code>032_desafios_y_ubicacion_google.sql</code> en el SQL Editor.
              <p className="mt-2 text-xs">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-[#F5F5F5] p-6 text-sm text-[#1A2E4A]/70">
              Todavía no hay desafíos abiertos. El predio los crea desde{" "}
              <Link href="/dashboard/desafios/crear" className="font-medium text-[var(--fulbito-green)] hover:underline">
                el panel admin
              </Link>
              .
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {items.map((d) => {
                const active = d.id === selectedId;
                return (
                  <li
                    key={d.id}
                    ref={(el) => {
                      cardRefs.current[d.id] = el;
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                        active
                          ? "border-[var(--fulbito-green)] ring-1 ring-[var(--fulbito-green)]"
                          : "border-[#E0E0E0] hover:border-[#1A2E4A]/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#1A2E4A]">{d.titulo}</p>
                          <p className="mt-1 text-xs text-[#1A2E4A]/70">
                            {MATCH_TIPO_LABEL[d.tipo] ?? d.tipo} · {d.fecha} · {horaCorta(d.hora_inicio)}
                          </p>
                          <p className="mt-2 flex items-center gap-1 text-sm text-[#1A2E4A]/70">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-1">{d.direccion}</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#1A2E4A] shadow">
                          {formatPremioArs(Number(d.premio))}
                        </span>
                      </div>
                    </button>
                    <Link
                      href={`/desafios/${d.id}`}
                      className="mt-2 inline-block text-sm font-medium text-[var(--fulbito-green)] hover:underline"
                    >
                      Ver desafío
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="h-[50vh] flex-1 lg:h-auto">
        <DesafiosPriceMap items={pins} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  );
}
