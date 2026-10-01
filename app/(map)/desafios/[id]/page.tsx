"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { getDesafioById } from "@/lib/desafios";
import { formatPremioArs, MATCH_TIPO_LABEL } from "@/lib/google-maps";
import { DesafiosPriceMap } from "@/components/maps/DesafiosPriceMap";
import type { Desafio } from "@/lib/types";

export default function DesafioDetallePage() {
  const params = useParams<{ id: string }>();
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;
      setLoading(true);
      setDesafio(await getDesafioById(params.id));
      setLoading(false);
    };
    load();
  }, [params?.id]);

  if (loading) {
    return <div className="px-6 py-10 text-[#1A2E4A]/70">Cargando desafío...</div>;
  }

  if (!desafio) {
    return (
      <div className="px-6 py-10">
        <p className="text-[#1A2E4A]">No encontramos este desafío.</p>
        <Link href="/desafios" className="mt-3 inline-block text-sm text-[var(--fulbito-green)] hover:underline">
          ← Volver al mapa
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2">
      <div>
        <Link href="/desafios" className="text-sm text-[#1A2E4A]/70 hover:underline">
          ← Volver al mapa
        </Link>
        <h1 className="mt-4 font-heading text-4xl tracking-wide text-[#1A2E4A]">{desafio.titulo}</h1>
        <p className="mt-2 text-2xl font-semibold text-[var(--fulbito-green)]">
          {formatPremioArs(Number(desafio.premio))}
        </p>
        <p className="mt-3 text-[#1A2E4A]/80">
          {MATCH_TIPO_LABEL[desafio.tipo] ?? desafio.tipo} · {desafio.fecha} · {desafio.hora_inicio.slice(0, 5)} ·{" "}
          {desafio.duracion_min} min
        </p>
        <p className="mt-3 flex items-start gap-2 text-[#1A2E4A]/80">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {desafio.direccion}
        </p>
        {desafio.descripcion && <p className="mt-6 whitespace-pre-wrap text-[#1A2E4A]/80">{desafio.descripcion}</p>}
      </div>
      <div className="h-[360px]">
        <DesafiosPriceMap
          items={[
            {
              id: desafio.id,
              lat: Number(desafio.lat),
              lng: Number(desafio.lng),
              premio: Number(desafio.premio),
              titulo: desafio.titulo,
            },
          ]}
          selectedId={desafio.id}
          onSelect={() => undefined}
        />
      </div>
    </div>
  );
}
