import type { Metadata } from "next";
import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";
import { siteUrl } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";
import { rpcPredioPublico } from "@shared/equipos";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const res = await rpcPredioPublico(supabase, slug);
  return res.ok ? res : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Predio" };
  return {
    title: String(p.nombre),
    description: `Horarios libres en ${p.nombre}.`,
    openGraph: { url: `${siteUrl}/p/${slug}` },
  };
}

export default async function PredioPublicoPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) {
    return (
      <SiteShell>
        <h1 className="font-display text-5xl text-plc-white">No encontramos ese predio</h1>
      </SiteShell>
    );
  }
  const turnos = Array.isArray(p.turnos) ? (p.turnos as Record<string, unknown>[]) : [];

  return (
    <SiteShell>
      <h1 className="font-display mt-4 text-5xl leading-none text-plc-white">{String(p.nombre)}</h1>
      <p className="mt-2 text-sm text-plc-text-secondary">
        {[p.barrio, p.direccion].filter(Boolean).map(String).join(" · ")}
      </p>
      <div className="card-plc mt-4 space-y-2 px-4 py-3 text-sm text-plc-text-secondary">
        {turnos.length === 0 ? <p>No hay horarios libres por ahora.</p> : null}
        {turnos.slice(0, 24).map((t) => (
          <p key={String(t.id)}>
            {String(t.fecha ?? "")} · {String(t.hora_inicio ?? "").slice(0, 5)} · {String(t.campo_nombre ?? "")}
          </p>
        ))}
      </div>
      <OpenInApp path={`reservar`} label="Reservar en PorLaCancha" />
    </SiteShell>
  );
}
