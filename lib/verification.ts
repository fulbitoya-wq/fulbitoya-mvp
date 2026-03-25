import { supabase } from "@/lib/supabase";
import type { Usuario, Verification, VerificationStatus } from "@/lib/types";

/** Obtiene el perfil del usuario desde public.usuarios (incluye verification_level) */
export async function getUsuario(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Usuario;
}

/** Obtiene la verificación de identidad del usuario (si existe) */
export async function getVerification(userId: string): Promise<Verification | null> {
  const { data, error } = await supabase
    .from("verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Verification;
}

/** Crea o actualiza la solicitud de verificación (sube URLs de DNI y selfie) */
export async function upsertVerification(
  userId: string,
  payload: { dni_front?: string; dni_back?: string; selfie?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("verifications").upsert(
    {
      user_id: userId,
      ...payload,
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  return { error: error?.message ?? null };
}

/** Indica si el usuario tiene identidad verificada (para mostrar opciones bloqueadas) */
export function isIdentityVerified(usuario: Usuario | null, verification: Verification | null): boolean {
  if (!usuario) return false;
  return usuario.verification_level >= 2 || verification?.status === "approved";
}

/** Mensaje corto de estado de verificación para el banner */
export function getVerificationBannerMessage(
  usuario: Usuario | null,
  verification: Verification | null
): { type: "pending" | "approved" | "rejected" | "none"; message: string } {
  if (!usuario) return { type: "none", message: "" };

  if (usuario.verification_level >= 2) {
    return { type: "approved", message: "Tu cuenta está verificada. Tenés acceso a todas las funciones." };
  }

  const status = verification?.status;
  if (status === "approved") {
    return { type: "approved", message: "Tu identidad fue verificada. Acceso completo habilitado." };
  }
  if (status === "rejected") {
    return {
      type: "rejected",
      message: "Tu verificación fue rechazada. Revisá los datos enviados o contactá soporte.",
    };
  }
  if (status === "pending") {
    return {
      type: "pending",
      message: "Tu verificación está en revisión. Algunas funciones estarán bloqueadas hasta que sea aprobada.",
    };
  }

  return {
    type: "pending",
    message: "Verificá tu identidad para desbloquear: crear desafíos/eventos y participar en partidas con apuesta.",
  };
}
