import { supabase } from "@/lib/supabase";
import type { Desafio, DesafioEstado, MatchTipo } from "@/lib/types";

export interface CreateDesafioInput {
  titulo: string;
  tipo: MatchTipo;
  premio: number;
  direccion: string;
  barrio?: string | null;
  place_id?: string | null;
  lat: number;
  lng: number;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  descripcion?: string | null;
  cancha_id?: string | null;
}

export async function createDesafio(
  input: CreateDesafioInput
): Promise<{ data: Desafio | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Debés estar logueado." };

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return { data: null, error: "Elegí una dirección del autocomplete de Google." };
  }

  const { data, error } = await supabase
    .from("desafios")
    .insert({
      owner_id: user.id,
      cancha_id: input.cancha_id ?? null,
      titulo: input.titulo.trim(),
      tipo: input.tipo,
      premio: input.premio,
      direccion: input.direccion.trim(),
      barrio: input.barrio?.trim() || null,
      place_id: input.place_id ?? null,
      lat: input.lat,
      lng: input.lng,
      fecha: input.fecha,
      hora_inicio: input.hora_inicio,
      duracion_min: input.duracion_min,
      descripcion: input.descripcion?.trim() || null,
      estado: "abierto",
    })
    .select("*")
    .single();

  if (error || !data) return { data: null, error: error?.message ?? "No se pudo crear el desafío." };
  return { data: data as Desafio, error: null };
}

export async function getDesafiosDelOwner(ownerId: string): Promise<Desafio[]> {
  const { data, error } = await supabase
    .from("desafios")
    .select("*")
    .eq("owner_id", ownerId)
    .order("fecha", { ascending: true });

  if (error || !data) return [];
  return data as Desafio[];
}

export async function getDesafiosPublicos(): Promise<{ data: Desafio[]; error: string | null }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("desafios")
    .select("*")
    .eq("estado", "abierto")
    .gte("fecha", today)
    .order("fecha", { ascending: true });

  if (error) {
    console.warn("Desafíos no disponibles:", error.message);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as Desafio[], error: null };
}

export async function getDesafioById(id: string): Promise<Desafio | null> {
  const { data, error } = await supabase.from("desafios").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as Desafio;
}

export async function updateDesafioEstado(
  id: string,
  estado: DesafioEstado
): Promise<{ ok: boolean; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debés estar logueado." };

  const { error } = await supabase
    .from("desafios")
    .update({ estado })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}
