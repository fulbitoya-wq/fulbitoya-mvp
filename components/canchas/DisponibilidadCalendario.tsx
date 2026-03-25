"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  Clock,
  Goal,
  Lightbulb,
} from "lucide-react";
import ReservarSlotButton from "@/components/canchas/ReservarSlotButton";

type CampoItem = {
  id: string;
  nombre: string;
  tipo: string | null;
  superficie: string | null;
  luz: boolean | null;
  camaras: boolean | null;
  minutero: boolean | null;
  marcador_gol: boolean | null;
  foto_url: string | null;
  observaciones: string | null;
};

type DisponibilidadItem = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio: number | null;
  campo_id: string;
};

type Props = {
  campos: CampoItem[];
  disponibilidades: DisponibilidadItem[];
  initialDateISO: string;
};

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(`${baseISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function prettyDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(time: string): string {
  return String(time).slice(0, 5);
}

export default function DisponibilidadCalendario({
  campos,
  disponibilidades,
  initialDateISO,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDateISO);

  const days = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => addDaysISO(initialDateISO, i)),
    [initialDateISO]
  );

  const tipoTexto: Record<string, string> = {
    "5": "Fútbol 5",
    "7": "Fútbol 7",
    "9": "Fútbol 9",
    "11": "Fútbol 11",
  };

  const dispByCampo = useMemo(() => {
    const m = new Map<string, DisponibilidadItem[]>();
    for (const d of disponibilidades) {
      if (d.fecha !== selectedDate) continue;
      if (!m.has(d.campo_id)) m.set(d.campo_id, []);
      m.get(d.campo_id)!.push(d);
    }
    for (const [k, v] of m) {
      v.sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
      m.set(k, v);
    }
    return m;
  }, [disponibilidades, selectedDate]);

  return (
    <div className="mt-8 space-y-6">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-[#E0E0E0] bg-white p-4 shadow-sm">
        <p className="text-sm text-[#1A2E4A]/70">
          Seleccioná fecha para ver horarios disponibles:
        </p>
        <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const active = d === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition ${
                  active
                    ? "scale-105 border-[var(--fulbito-green)] bg-[var(--fulbito-green)] px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm"
                    : "border-[#E0E0E0] bg-white text-[#1A2E4A] hover:bg-[#F5F5F5]"
                }`}
              >
                {prettyDateLabel(d)}
              </button>
            );
          })}
        </div>
      </div>

      {campos.map((campo) => {
        const campoDisp = dispByCampo.get(campo.id) ?? [];
        return (
          <div
            key={campo.id}
            id={`campo-${campo.id}`}
            className="scroll-mt-28 rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E0E0E0] bg-[#F5F5F5]">
                  {campo.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={campo.foto_url}
                      alt={`Foto del campo ${campo.nombre}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#1A2E4A]/50">
                      +
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-subheading text-xl font-semibold text-[#1A2E4A]">
                    {campo.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-[#1A2E4A]/70">
                    {tipoTexto[campo.tipo ?? ""] ?? campo.tipo} - {campo.superficie ?? "—"}
                  </p>
                  {(campo.luz ||
                    campo.camaras ||
                    campo.minutero ||
                    campo.marcador_gol) && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#1A2E4A]/60">
                      {campo.luz && (
                        <span className="inline-flex items-center gap-2">
                          <Lightbulb className="h-3.5 w-3.5" />
                          Luz
                        </span>
                      )}
                      {campo.camaras && (
                        <span className="inline-flex items-center gap-2">
                          <Camera className="h-3.5 w-3.5" />
                          Cámaras
                        </span>
                      )}
                      {campo.minutero && (
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Minutero
                        </span>
                      )}
                      {campo.marcador_gol && (
                        <span className="inline-flex items-center gap-2">
                          <Goal className="h-3.5 w-3.5" />
                          Marcador
                        </span>
                      )}
                    </div>
                  )}
                  {campo.observaciones && (
                    <p className="mt-2 text-sm text-[#1A2E4A]/70">{campo.observaciones}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {campoDisp.length === 0 ? (
                <p className="text-center text-sm text-[#1A2E4A]/70">
                  Sin horarios disponibles para {selectedDate}.
                </p>
              ) : (
                <ul className="flex flex-wrap justify-center gap-2">
                  {campoDisp.map((d) => (
                    <li
                      key={d.id}
                      className="w-full rounded-2xl border border-[#E0E0E0] bg-[#F5F5F5] px-3 py-2 sm:w-auto sm:px-4 sm:py-3"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-[#1A2E4A]/90">
                          {formatTime(d.hora_inicio)} - {formatTime(d.hora_fin)}
                        </span>
                        <span className="text-xs text-[#1A2E4A]/70">
                          Precio: ${Number(d.precio ?? 0).toLocaleString("es-AR")} / hora
                        </span>
                        <div className="mt-1 flex justify-center">
                          <ReservarSlotButton
                            disponibilidadId={d.id}
                            precio={Number(d.precio ?? 0)}
                            label="Reservar"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

