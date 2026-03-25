import { supabase } from "@/lib/supabase";

export interface Provincia {
  id: string;
  nombre: string;
}

export interface Partido {
  id: string;
  nombre: string;
  provincia_id: string;
}

export interface Localidad {
  id: string;
  nombre: string;
  partido_id: string;
  codigo_postal: string | null;
  lat: number | null;
  lng: number | null;
}

export async function getProvincias(): Promise<Provincia[]> {
  const { data, error } = await supabase
    .from("provincias")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) return [];
  return (data ?? []) as Provincia[];
}

export async function getPartidosByProvincia(provinciaId: string): Promise<Partido[]> {
  const { data, error } = await supabase
    .from("partidos")
    .select("id, nombre, provincia_id")
    .eq("provincia_id", provinciaId)
    .order("nombre", { ascending: true });

  if (error) return [];
  return (data ?? []) as Partido[];
}

export async function getLocalidadesByPartido(partidoId: string): Promise<Localidad[]> {
  const { data, error } = await supabase
    .from("localidades")
    .select("id, nombre, partido_id, codigo_postal, lat, lng")
    .eq("partido_id", partidoId)
    .order("nombre", { ascending: true });

  if (error) return [];
  return (data ?? []) as Localidad[];
}

