/** Nivel de verificación del usuario (usuarios.verification_level) */
export type VerificationLevel = 0 | 1 | 2;
export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, string> = {
  0: "Básica",
  1: "Teléfono verificado",
  2: "Identidad verificada",
};

/** Estado de la verificación de identidad (verifications.status) */
export type VerificationStatus = "pending" | "approved" | "rejected";
export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  telefono: string | null;
  rol: "owner" | "jugador";
  verification_level: VerificationLevel;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  dni_front: string | null;
  dni_back: string | null;
  selfie: string | null;
  status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  ciudad: string | null;
  uniforme_color: string | null;
  uniforme_imagen_url: string | null;
  tipo_equipo: number | null;
  capacidad_max: number | null;
  color_primario: string | null;
  color_secundario: string | null;
  provincia_id: string | null;
  partido_id: string | null;
  localidad_id: string | null;
  max_miembros: number | null;
  creado_por: string;
  created_at: string;
  updated_at: string;
}

export type EquipoMiembroRole = "captain" | "player";

export interface EquipoMiembro {
  id: string;
  equipo_id: string;
  usuario_id: string;
  es_capitan: boolean;
  role: EquipoMiembroRole;
  created_at: string;
}

export interface EquipoInvitacion {
  id: string;
  equipo_id: string;
  invitado_email: string;
  invitado_id: string | null;
  invitado_por: string;
  estado: "pendiente" | "aceptada" | "rechazada";
  created_at: string;
  updated_at: string;
}

export interface EquipoConMiembros extends Equipo {
  miembros: (EquipoMiembro & { usuario?: Usuario })[];
  invitaciones_pendientes?: EquipoInvitacion[];
}

/** @deprecated Use EquipoInvitacion (equipo_invitaciones table). Kept for type compatibility. */
export type TeamInvitation = EquipoInvitacion;
