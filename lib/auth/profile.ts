"use client";

import type { OrigenRegistro } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export async function completeOrigenRegistro(userId: string, origen: OrigenRegistro) {
  const { data } = await supabase
    .from("usuarios")
    .select("origen_registro")
    .eq("id", userId)
    .maybeSingle();

  if (data && data.origen_registro == null) {
    await supabase.from("usuarios").update({ origen_registro: origen }).eq("id", userId);
  }
}

export async function redirectPathForUser(userId: string, fallbackJugador = "/jugador"): Promise<string> {
  const { data } = await supabase.from("usuarios").select("rol").eq("id", userId).maybeSingle();
  if (data?.rol === "owner") return "/dashboard";
  return fallbackJugador;
}
