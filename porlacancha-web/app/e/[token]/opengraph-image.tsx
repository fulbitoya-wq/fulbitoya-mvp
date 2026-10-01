import { ImageResponse } from "next/og";
import { getSupabase } from "@/lib/supabase";
import { rpcGetEquipoPorToken } from "@shared/equipos";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Og({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = getSupabase();
  const res = supabase ? await rpcGetEquipoPorToken(supabase, token) : null;
  const nombre = res && res.ok ? res.nombre : "PorLaCancha";
  const sub = res && res.ok ? "Te invitaron a este equipo" : "Enlace inválido";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#001B44",
          color: "#F7F5EF",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 28, color: "#8BC9EB", fontWeight: 700 }}>PORLACANCHA · Y ALGO MÁS</div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 16 }}>{nombre}</div>
        <div style={{ fontSize: 32, color: "#B8C4D6", marginTop: 12 }}>{sub}</div>
      </div>
    ),
    { ...size }
  );
}
