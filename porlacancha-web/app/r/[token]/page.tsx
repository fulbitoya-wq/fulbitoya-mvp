import type { Metadata } from "next";
import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";
import { siteUrl } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";
import { mensajeErrorEquipo, rpcVerEnlacePago } from "@shared/equipos";

type Props = { params: Promise<{ token: string }> };

function pesos(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

async function loadEnlace(token: string) {
  const supabase = getSupabase();
  if (!supabase) return null;
  return rpcVerEnlacePago(supabase, token);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const r = await loadEnlace(token);
  if (!r || !r.ok) {
    return { title: "Reservá tu turno", description: "Enlace de reserva PorLaCancha." };
  }
  return {
    title: `Pagá la seña · ${r.cancha_nombre}`,
    description: `Turno el ${r.fecha} a las ${String(r.hora_inicio ?? "").slice(0, 5)}.`,
    openGraph: { url: `${siteUrl}/r/${token}` },
  };
}

export default async function EnlacePagoPage({ params }: Props) {
  const { token } = await params;
  const r = await loadEnlace(token);

  if (!r) {
    return (
      <SiteShell>
        <h1 className="font-display text-5xl text-plc-white">Enlace inválido</h1>
      </SiteShell>
    );
  }

  if (!r.ok) {
    const alts = Array.isArray(r.alternativas) ? (r.alternativas as Record<string, unknown>[]) : [];
    return (
      <SiteShell>
        <h1 className="font-display text-4xl leading-none text-plc-white">
          {r.error === "enlace_vencido"
            ? "Ese horario ya pasó"
            : r.error === "enlace_invalido"
              ? "Enlace inválido"
              : "Este horario ya fue reservado"}
        </h1>
        <p className="mt-3 text-sm text-plc-text-secondary">{mensajeErrorEquipo(r.error)}</p>
        {alts.length > 0 ? (
          <div className="card-plc mt-4 px-4 py-3 text-sm text-plc-text-secondary">
            <p className="mb-2 font-semibold text-plc-white">Horarios libres más cercanos</p>
            {alts.map((a) => (
              <p key={String(a.id)}>
                {String(a.fecha ?? "")} · {String(a.hora_inicio ?? "").slice(0, 5)}
              </p>
            ))}
          </div>
        ) : null}
        <OpenInApp path="" label="Ver predios en PorLaCancha" />
      </SiteShell>
    );
  }

  const hora = String(r.hora_inicio ?? "").slice(0, 5);

  return (
    <SiteShell>
      <h1 className="font-display mt-4 text-5xl leading-none text-plc-white">Pagá para confirmar</h1>
      <div className="card-plc mt-4 space-y-1 px-4 py-3 text-sm text-plc-text-secondary">
        <p className="text-plc-white">{String(r.titular_nombre ?? "")}</p>
        <p>{String(r.cancha_nombre ?? "")} · {String(r.campo_nombre ?? "")}</p>
        <p>
          {String(r.fecha ?? "")} {hora}
        </p>
        <p>Seña {pesos(r.sena)}</p>
        {r.descuento_activo ? <p>Si pagás el total, hay descuento por adelantado.</p> : null}
      </div>
      <p className="mt-3 text-sm text-plc-text-secondary">
        Entrá o registrate en la app y pagá la seña (o el total). El turno queda para el primero que pague.
      </p>
      <OpenInApp path={`r/${token}`} label="Pagar en PorLaCancha" />
    </SiteShell>
  );
}
