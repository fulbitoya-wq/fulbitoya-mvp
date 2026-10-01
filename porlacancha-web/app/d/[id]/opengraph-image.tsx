import { ImageResponse } from "next/og";
import { getSupabase } from "@/lib/supabase";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Og({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();
  const { data } = supabase
    ? await supabase.from("desafios").select("titulo, premio, tipo").eq("id", id).maybeSingle()
    : { data: null };
  const titulo = data?.titulo ?? "PorLaCancha";
  const premio =
    typeof data?.premio === "number"
      ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
          data.premio
        )
      : "Desafío";

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
        <div style={{ fontSize: 56, fontWeight: 800, marginTop: 16 }}>{titulo}</div>
        <div style={{ fontSize: 40, color: "#D9A928", marginTop: 12 }}>{premio}</div>
      </div>
    ),
    { ...size }
  );
}
