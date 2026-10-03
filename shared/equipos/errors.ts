export const EQUIPOS_RPC_ERRORS: Record<string, string> = {
  no_auth: "Tenés que iniciar sesión.",
  nombre_requerido: "El nombre del equipo es obligatorio.",
  no_capitan: "Solo el capitán puede hacer esto.",
  enlace_invalido: "El enlace no existe o ya no está activo.",
  ya_es_miembro: "Ya formás parte de este equipo.",
  ya_pendiente: "Ya hay una solicitud o invitación pendiente.",
  identificador_requerido: "Ingresá un username o teléfono.",
  usuario_no_encontrado: "No encontramos a nadie con ese username o teléfono.",
  no_auto_invitar: "No podés invitarte a vos mismo.",
  no_existe: "No encontramos esa solicitud.",
  no_pendiente: "Esa solicitud ya no está pendiente.",
  no_destinatario: "Esta invitación no es para tu cuenta.",
  capitan_debe_transferir: "El capitán no puede salir sin transferir la capitanía.",
  no_miembro: "No sos miembro de este equipo.",
  mismo_usuario: "Elegí otro jugador para la capitanía.",
  destino_no_miembro: "Ese usuario no es miembro activo del equipo.",
  no_auto_expulsar: "No podés expulsarte a vos mismo.",
  desafio_no_existe: "No encontramos ese desafío.",
  desafio_cerrado: "Ese desafío ya no está abierto.",
  inscripcion_cerrada: "Se cerró el tiempo para inscribir.",
  convocados_requeridos: "Marcá quiénes juegan.",
  minimo_convocados: "No llega al mínimo de convocados para ese formato.",
  convocado_no_miembro: "Hay alguien marcado que no está en el plantel.",
  convocado_ocupado: "Alguien de la lista ya está convocado en el otro equipo.",
  falta_nacimiento: "A alguien de la lista le falta la fecha de nacimiento en el perfil.",
  menor_18: "Con premio, todos los convocados tienen que ser mayores de 18.",
  ya_inscripto: "Ese equipo ya está inscripto.",
  bloqueado: "No se puede invitar: hay un bloqueo entre estas cuentas.",
  ya_reportado: "Ya denunciaste a esta persona. La estamos revisando.",
  motivo_invalido: "Elegí un motivo para la denuncia.",
  usuario_requerido: "Falta el usuario.",
  no_auto: "Eso no aplica a tu propia cuenta.",
  cupo_lleno: "Ya no hay lugar en este desafío.",
  no_activa: "Esa inscripción ya no está activa.",
  fuera_de_plazo: "Ya no se puede cancelar: pasó el plazo.",
};

export function mensajeErrorEquipo(code: string | null | undefined, extra?: { quienes?: string; minimo?: number }): string {
  if (!code) return "No se pudo completar la acción.";
  if (code === "falta_nacimiento" && extra?.quienes) {
    return `Les falta la fecha de nacimiento: ${extra.quienes}. Cargala en Editar perfil (mayores de 18 si hay premio).`;
  }
  if (code === "menor_18" && extra?.quienes) {
    return `Menores de 18: ${extra.quienes}. Con premio no pueden jugar.`;
  }
  if (code === "minimo_convocados" && extra?.minimo) {
    return `Tenés que convocar al menos ${extra.minimo} jugadores para este formato.`;
  }
  return EQUIPOS_RPC_ERRORS[code] ?? code;
}
