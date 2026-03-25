import { supabase } from "@/lib/supabase";

export interface Campo {
  id: string;
  cancha_id: string;
  nombre: string;
  tipo: string | null;
  superficie: string | null;
  valor_hora: number | null;
  valor_reserva: number | null;
  luz: boolean | null;
  camaras: boolean | null;
  minutero: boolean | null;
  marcador_gol: boolean | null;
  observaciones: string | null;
  foto_url: string | null;
  created_at: string;
}

export async function getCamposByCancha(canchaId: string): Promise<Campo[]> {
  const { data, error } = await supabase
    .from("campos")
    .select("*")
    .eq("cancha_id", canchaId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Campo[];
}

export interface CrearCampoInput {
  cancha_id: string;
  nombre: string;
  tipo: string; // '5' | '7' | '9' | '11'
  superficie: string;
  valor_hora: number;
  valor_reserva: number;
  luz?: boolean | null;
  camaras?: boolean | null;
  minutero?: boolean | null;
  marcador_gol?: boolean | null;
  observaciones?: string | null;
  foto_url?: string | null;
}

export async function crearCampo(input: CrearCampoInput): Promise<{ data: { id: string } | null; error: string | null }> {
  const { data, error } = await supabase
    .from("campos")
    .insert({
      cancha_id: input.cancha_id,
      nombre: input.nombre,
      tipo: input.tipo,
      superficie: input.superficie,
      valor_hora: input.valor_hora,
      valor_reserva: input.valor_reserva,
      luz: input.luz ?? null,
      camaras: input.camaras ?? null,
      minutero: input.minutero ?? null,
      marcador_gol: input.marcador_gol ?? null,
      observaciones: input.observaciones ?? null,
      foto_url: input.foto_url ?? null,
    })
    .select("id")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as { id: string }, error: null };
}

