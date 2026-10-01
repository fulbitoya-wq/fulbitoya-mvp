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

export type OrigenRegistro = "fulbitoya" | "porlacancha";

export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
  telefono: string | null;
  rol: "owner" | "jugador";
  origen_registro: OrigenRegistro | null;
  avatar_url: string | null;
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

export type MatchTipo = "f5" | "f7" | "f9" | "f11";
export type MatchEstado = "pending" | "completo" | "confirmado" | "cancelado";
export type MatchVisibilidad = "privado" | "publico";
export type MatchPlayerEstado = "invitado" | "confirmado" | "rechazado";
export type MatchPlayerOrigen = "invitacion" | "solicitud";

export interface Match {
  id: string;
  organizer_id: string;
  tipo: MatchTipo;
  provincia_id: string;
  partido_id: string;
  localidad_id: string;
  direccion: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  estado: MatchEstado;
  visibilidad: MatchVisibilidad;
  created_at: string;
}

export type DesafioEstado = "abierto" | "completo" | "cancelado" | "finalizado";

export interface Desafio {
  id: string;
  owner_id: string;
  cancha_id: string | null;
  titulo: string;
  tipo: MatchTipo;
  premio: number;
  direccion: string;
  barrio: string | null;
  place_id: string | null;
  lat: number;
  lng: number;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  descripcion: string | null;
  estado: DesafioEstado;
  created_at: string;
}

export interface MatchPlayer {
  id: string;
  match_id: string;
  user_id: string | null;
  invited_email: string | null;
  origen: MatchPlayerOrigen;
  estado: MatchPlayerEstado;
  created_at: string;
}
