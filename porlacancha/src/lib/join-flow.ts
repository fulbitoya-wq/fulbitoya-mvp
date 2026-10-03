import { mensajeErrorEquipo, rpcSolicitarIngresoPorToken, tokenEnlaceSchema } from "@shared/equipos";
import { supabase } from "./supabase";
import { showNotice } from "../ui/AppDialog";

export async function aplicarTokenUnirse(token: string): Promise<boolean> {
  const parsed = tokenEnlaceSchema.safeParse(token);
  if (!parsed.success) {
    showNotice("Enlace inválido", "Ese enlace de equipo no es válido.");
    return false;
  }
  const res = await rpcSolicitarIngresoPorToken(supabase, parsed.data);
  if (!res.ok) {
    showNotice("No se pudo unir", mensajeErrorEquipo(res.error));
    return false;
  }
  showNotice(
    "Solicitud enviada",
    "El capitán tiene que aceptar tu pedido para que entres al plantel."
  );
  return true;
}
