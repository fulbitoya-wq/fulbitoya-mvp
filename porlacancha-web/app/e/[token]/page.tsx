import type { Metadata } from "next";
import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";
import { siteUrl } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";
import { rpcGetEquipoPorToken } from "@shared/equipos";

type Props = { params: Promise<{ token: string }> };

async function loadEquipo(token: string) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const res = await rpcGetEquipoPorToken(supabase, token);
  return res.ok ? res : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const eq = await loadEquipo(token);
  if (!eq) {
    return { title: "Enlace inválido", description: "Ese equipo no está disponible." };
  }
  const title = `Te invitaron a ${eq.nombre}`;
  const description = `Sumate a ${eq.nombre} en PorLaCancha.${eq.formato ? ` Formato ${eq.formato.toUpperCase()}.` : ""}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/e/${token}`,
      images: eq.escudo_url ? [{ url: eq.escudo_url }] : undefined,
    },
  };
}

export default async function EquipoInvitePage({ params }: Props) {
  const { token } = await params;
  const eq = await loadEquipo(token);

  if (!eq) {
    return (
      <SiteShell>
        <h1 className="font-display text-5xl text-plc-white">Enlace inválido</h1>
        <p className="mt-3 text-sm text-plc-text-secondary">
          Ese enlace no existe o el capitán lo desactivó. Pedile uno nuevo.
        </p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {eq.escudo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={eq.escudo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="h-20 w-20 rounded-full bg-plc-surface" />
      )}
      <h1 className="font-display mt-4 text-5xl leading-none text-plc-white">
        Te invitaron a sumarte a {eq.nombre}
      </h1>
      <div className="card-plc mt-4 px-4 py-3 text-sm text-plc-text-secondary">
        {eq.formato ? <p>Formato {eq.formato.toUpperCase()}</p> : null}
        <p>
          {eq.miembros} {eq.miembros === 1 ? "jugador" : "jugadores"} en el plantel
        </p>
        {eq.zona ? <p>{eq.zona}</p> : null}
      </div>
      <OpenInApp path={`equipo/unirse/${token}`} label="Abrir en PorLaCancha" />
    </SiteShell>
  );
}
