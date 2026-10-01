import type { Metadata } from "next";
import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";
import { siteUrl } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";

type Props = { params: Promise<{ id: string }> };

type DesafioPublico = {
  id: string;
  titulo: string;
  tipo: string;
  premio: number;
  direccion: string;
  fecha: string;
  hora_inicio: string;
  estado: string;
  canchas: { nombre: string } | { nombre: string }[] | null;
};

function canchaNombre(row: DesafioPublico): string | null {
  const c = row.canchas;
  if (!c) return null;
  const one = Array.isArray(c) ? c[0] : c;
  return one?.nombre ?? null;
}

async function loadDesafio(id: string): Promise<DesafioPublico | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("desafios")
    .select("id, titulo, tipo, premio, direccion, fecha, hora_inicio, estado, canchas(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!error && data) return data as DesafioPublico;
  const { data: plain } = await supabase
    .from("desafios")
    .select("id, titulo, tipo, premio, direccion, fecha, hora_inicio, estado")
    .eq("id", id)
    .maybeSingle();
  return (plain as DesafioPublico | null) ?? null;
}

function premio(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await loadDesafio(id);
  if (!d) return { title: "Desafío no disponible" };
  const title = `${d.titulo} · ${premio(d.premio)}`;
  const description = `${d.fecha} · ${d.tipo.toUpperCase()} · ${d.direccion}`;
  return {
    title,
    description,
    openGraph: { title, description, url: `${siteUrl}/d/${id}` },
  };
}

export default async function DesafioPage({ params }: Props) {
  const { id } = await params;
  const d = await loadDesafio(id);

  if (!d) {
    return (
      <SiteShell>
        <h1 className="font-display text-5xl text-plc-white">Desafío no disponible</h1>
        <p className="mt-3 text-sm text-plc-text-secondary">No está abierto o el enlace no es válido.</p>
      </SiteShell>
    );
  }

  const predio = canchaNombre(d);

  return (
    <SiteShell>
      <p className="text-xs font-semibold tracking-[0.22em] text-plc-sky">DESAFÍO</p>
      <h1 className="font-display mt-2 text-5xl leading-none text-plc-white">{d.titulo}</h1>
      <p className="mt-4 text-3xl font-extrabold text-plc-gold">{premio(d.premio)}</p>
      <div className="card-plc mt-5 space-y-2 px-4 py-4 text-sm text-plc-text-secondary">
        <p>
          {d.fecha} · {d.hora_inicio?.slice(0, 5)}
        </p>
        <p>Formato {d.tipo.toUpperCase()}</p>
        <p>{predio ? `Predio: ${predio}` : d.direccion}</p>
        {predio ? <p>{d.direccion}</p> : null}
        <p>Cupos: confirmalos en la app al inscribir el equipo.</p>
      </div>
      <OpenInApp path={`desafio/${id}`} label="Abrir en PorLaCancha" />
    </SiteShell>
  );
}
