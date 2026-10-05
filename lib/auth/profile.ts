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

export async function enterFulbitoYa(): Promise<string> {
  await supabase.rpc("fy_asegurar_owner");
  return "/dashboard";
}

/** En FulbitoYa el destino es siempre el panel del predio. */
export async function redirectPathForUser(
  _userId?: string,
  _fallbackJugador = "/dashboard",
): Promise<string> {
  return enterFulbitoYa();
}
