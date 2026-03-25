import { supabase } from "@/lib/supabase";
import type { Equipo, EquipoMiembro, EquipoInvitacion, EquipoMiembroRole, Usuario } from "@/lib/types";

export interface EquipoConRol {
  equipo: Equipo;
  role: EquipoMiembroRole;
}

export interface CrearEquipoInput {
  nombre: string;
  ciudad?: string;
  tipo_equipo: number;
  capacidad_max: number;
  color_primario: string;
  color_secundario: string;
  provincia_id?: string | null;
  partido_id?: string | null;
  localidad_id?: string | null;
  uniforme_imagen_url?: string;
  creado_por: string;
}

/**
 * Creates a team and inserts the creator as captain in equipo_miembros.
 * Flow: 1) insert equipos, 2) insert equipo_miembros (creator as captain).
 * If step 2 fails, the team is deleted and an error is returned.
 * Uses auth.uid() (via session) for usuario_id to ensure consistency with usuarios.id.
 */
export async function crearEquipo(input: CrearEquipoInput): Promise<{ data: Equipo | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id;
  if (!authUserId) return { data: null, error: "Debés estar logueado" };

  // Source of truth: la capacidad se calcula desde el tipo (aunque también venga enviada desde el form)
  const capacidad = Number(input.capacidad_max ?? (input.tipo_equipo * 2));

  const { data: equipo, error: errEquipo } = await supabase
    .from("equipos")
    .insert({
      nombre: input.nombre,
      ciudad: input.ciudad ?? null,
      provincia_id: input.provincia_id ?? null,
      partido_id: input.partido_id ?? null,
      localidad_id: input.localidad_id ?? null,
      tipo_equipo: input.tipo_equipo,
      capacidad_max: capacidad,
      color_primario: input.color_primario,
      color_secundario: input.color_secundario,
      // Mantener compatibilidad con la UI actual (que todavía lee uniforme_color)
      uniforme_color: `${input.color_primario} / ${input.color_secundario}`,
      uniforme_imagen_url: input.uniforme_imagen_url ?? null,
      // Mantener compatibilidad: el campo anterior se llenaba desde el form
      max_miembros: capacidad,
      creado_por: authUserId,
    })
    .select()
    .single();

  if (errEquipo) return { data: null, error: errEquipo.message };
  if (!equipo) return { data: null, error: "No se pudo crear el equipo" };

  console.log("Inserting member with ID:", authUserId);
  const { error: errMiembro } = await supabase.from("equipo_miembros").insert({
    equipo_id: equipo.id,
    usuario_id: authUserId,
    role: "captain",
  });

  if (errMiembro) {
    await supabase.from("equipos").delete().eq("id", equipo.id);
    return { data: null, error: errMiembro.message };
  }

  return { data: equipo as Equipo, error: null };
}

/** Lista equipos del usuario con su rol (capitán o jugador) desde equipo_miembros */
export async function getEquiposDelUsuario(userId: string): Promise<EquipoConRol[]> {
  const { data: rows, error } = await supabase
    .from("equipo_miembros")
    .select("role, equipos(*)")
    .eq("usuario_id", userId);

  if (error) return [];
  if (!rows?.length) return [];

  return rows
    .map((r) => {
      const nested = r.equipos as unknown;
      const eq = Array.isArray(nested) ? nested[0] : nested;
      if (!eq) return null;
      return { equipo: eq as Equipo, role: r.role as EquipoMiembroRole };
    })
    .filter((x): x is EquipoConRol => x !== null);
}

/** Obtiene un equipo por ID con miembros y invitaciones pendientes (equipo_invitaciones) */
export async function getEquipoById(
  equipoId: string,
  userId: string
): Promise<{
  equipo: Equipo | null;
  miembros: (EquipoMiembro & { usuarios?: { nombre: string | null; email: string } | null })[];
  invitaciones: EquipoInvitacion[];
  teamInvitations: EquipoInvitacion[];
  esCapitan: boolean;
}> {
  console.log("Using table: equipo_invitaciones");
  const { data: equipo, error: errEquipo } = await supabase
    .from("equipos")
    .select("*")
    .eq("id", equipoId)
    .single();
  if (errEquipo || !equipo) {
    return { equipo: null, miembros: [], invitaciones: [], teamInvitations: [], esCapitan: false };
  }

  const { data: miembros } = await supabase
    .from("equipo_miembros")
    .select(
      `
      id,
      equipo_id,
      usuario_id,
      es_capitan,
      role,
      created_at,
      usuarios (
        nombre,
        email
      )
    `
    )
    .eq("equipo_id", equipoId);
  const listaMiembros = (miembros ?? []).map((m) => {
    const nested = m.usuarios as unknown;
    const u = Array.isArray(nested) ? nested[0] : nested;
    return {
      ...m,
      usuarios: (u ?? null) as { nombre: string | null; email: string } | null,
    } as EquipoMiembro & { usuarios?: { nombre: string | null; email: string } | null };
  });
  console.log("TEAM MEMBERS:", listaMiembros);

  const esCapitan = listaMiembros.some((m) => m.usuario_id === userId && (m.role === "captain" || m.es_capitan));

  const { data: invitaciones } = await supabase
    .from("equipo_invitaciones")
    .select("*")
    .eq("equipo_id", equipoId)
    .eq("estado", "pendiente");
  const listaInvitaciones = (invitaciones ?? []) as EquipoInvitacion[];

  return {
    equipo: equipo as Equipo,
    miembros: listaMiembros,
    invitaciones: listaInvitaciones,
    teamInvitations: listaInvitaciones,
    esCapitan,
  };
}

/** Invita a un jugador al equipo por email (solo capitán). Crea invitación; si el usuario existe, se puede aceptar después. */
export async function invitarJugadorAlEquipo(
  equipoId: string,
  capitánId: string,
  email: string
): Promise<{ error: string | null }> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return { error: "El email es obligatorio" };

  const { data: usuarioInvitado } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", emailNorm)
    .maybeSingle();

  const { error } = await supabase.from("equipo_invitaciones").insert({
    equipo_id: equipoId,
    invitado_email: emailNorm,
    invitado_id: usuarioInvitado?.id ?? null,
    invitado_por: capitánId,
    estado: "pendiente",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una invitación pendiente para ese email." };
    return { error: error.message };
  }
  return { error: null };
}

/** Aceptar invitación (el usuario logueado acepta por su email). Uses auth.uid() for usuario_id. */
export async function aceptarInvitacion(
  invitacionId: string,
  userId: string
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id;
  if (!authUserId) return { error: "Debés estar logueado" };

  const { data: inv } = await supabase
    .from("equipo_invitaciones")
    .select("*")
    .eq("id", invitacionId)
    .eq("estado", "pendiente")
    .single();
  if (!inv) return { error: "Invitación no encontrada o ya fue procesada" };

  const { data: usuario } = await supabase.from("usuarios").select("email").eq("id", authUserId).single();
  const emailUsuario = usuario?.email?.toLowerCase();
  if (emailUsuario !== inv.invitado_email && inv.invitado_id !== authUserId) {
    return { error: "Esta invitación no corresponde a tu cuenta" };
  }

  const { error: errUpdate } = await supabase
    .from("equipo_invitaciones")
    .update({ estado: "aceptada", invitado_id: authUserId, updated_at: new Date().toISOString() })
    .eq("id", invitacionId);
  if (errUpdate) return { error: errUpdate.message };

  console.log("Inserting member with ID:", authUserId);
  const { error: errInsert } = await supabase.from("equipo_miembros").insert({
    equipo_id: inv.equipo_id,
    usuario_id: authUserId,
    role: "player",
  });
  if (errInsert) return { error: errInsert.message };

  return { error: null };
}

/** Rechazar invitación */
export async function rechazarInvitacion(invitacionId: string, userId: string): Promise<{ error: string | null }> {
  const { data: inv } = await supabase.from("equipo_invitaciones").select("*").eq("id", invitacionId).single();
  if (!inv) return { error: "Invitación no encontrada" };
  const { data: usuario } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  const emailUsuario = usuario?.email?.toLowerCase();
  if (emailUsuario !== inv.invitado_email && inv.invitado_id !== userId) {
    return { error: "Esta invitación no corresponde a tu cuenta" };
  }
  const { error } = await supabase
    .from("equipo_invitaciones")
    .update({ estado: "rechazada", updated_at: new Date().toISOString() })
    .eq("id", invitacionId);
  return { error: error?.message ?? null };
}

/** Invitaciones pendientes para el usuario logueado (equipo_invitaciones) */
export async function getInvitacionesPendientes(userId: string): Promise<(EquipoInvitacion & { equipo_nombre?: string })[]> {
  const { data: usuario } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  const email = usuario?.email?.toLowerCase();
  if (!email) return [];

  const { data: rows } = await supabase
    .from("equipo_invitaciones")
    .select("*")
    .eq("estado", "pendiente");
  if (!rows?.length) return [];

  const filtered = rows.filter(
    (r: { invitado_email?: string; invitado_id?: string }) =>
      (r.invitado_email?.toLowerCase() === email) || r.invitado_id === userId
  ) as EquipoInvitacion[];

  const equipoIds = [...new Set(filtered.map((r) => r.equipo_id))];
  const { data: equipos } = await supabase.from("equipos").select("id, nombre").in("id", equipoIds);
  const nombresMap = new Map((equipos ?? []).map((e) => [e.id, e.nombre]));

  return filtered.map((r) => ({ ...r, equipo_nombre: nombresMap.get(r.equipo_id) }));
}

// --- Invitations: single source equipo_invitaciones ---

/** Captain invites a player by email. Inserts into equipo_invitaciones with estado pendiente. */
export async function inviteToTeam(
  equipoId: string,
  captainId: string,
  email: string
): Promise<{ error: string | null }> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return { error: "El email es obligatorio" };

  // Evitar duplicar invitaciones pendientes al mismo email para el mismo equipo
  const { data: existing } = await supabase
    .from("equipo_invitaciones")
    .select("id, estado")
    .eq("equipo_id", equipoId)
    .ilike("invitado_email", emailNorm)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (existing) {
    return { error: "Ya existe una invitación pendiente para ese email." };
  }

  const { data: invitedUser } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", emailNorm)
    .maybeSingle();

  const { error } = await supabase.from("equipo_invitaciones").insert({
    equipo_id: equipoId,
    invitado_email: emailNorm,
    invitado_id: invitedUser?.id ?? null,
    invitado_por: captainId,
    estado: "pendiente",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una invitación pendiente para ese email." };
    return { error: error.message };
  }

  // Intentar enviar email de invitación (no bloquear en caso de error)
  try {
    const { data: equipo } = await supabase
      .from("equipos")
      .select("nombre")
      .eq("id", equipoId)
      .single();

    const type = invitedUser ? "registered" : "unregistered";

    await fetch("/api/send-invite-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailNorm,
        teamName: equipo?.nombre ?? "tu equipo",
        type,
      }),
    });
  } catch (e) {
    console.error("Error calling send-invite-email API:", e);
  }

  return { error: null };
}

/** Cancel a pending team invitation (only sender or captain should call this) */
export async function cancelTeamInvitation(
  invitationId: string,
  currentUserId: string
): Promise<{ error: string | null }> {
  const { data: inv } = await supabase
    .from("equipo_invitaciones")
    .select("estado")
    .eq("id", invitationId)
    .single();
  if (!inv) return { error: "Invitación no encontrada" };
  if (inv.estado !== "pendiente") return { error: "La invitación ya fue procesada" };

  const { error } = await supabase
    .from("equipo_invitaciones")
    .update({ estado: "rechazada" })
    .eq("id", invitationId);

  return { error: error?.message ?? null };
}

/** Invitations for current user (invitado_email = user email) from equipo_invitaciones */
export async function getTeamInvitationsForUser(
  userId: string
): Promise<(EquipoInvitacion & { equipo_nombre?: string })[]> {
  console.log("Using table: equipo_invitaciones");
  const { data: usuario } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  const email = usuario?.email?.toLowerCase();
  if (!email) return [];

  const { data: rows } = await supabase
    .from("equipo_invitaciones")
    .select("*")
    .eq("estado", "pendiente");
  if (!rows?.length) return [];

  const filtered = rows.filter(
    (r: { invitado_email?: string; invitado_id?: string }) =>
      r.invitado_email?.toLowerCase() === email || r.invitado_id === userId
  ) as EquipoInvitacion[];

  const equipoIds = [...new Set(filtered.map((r) => r.equipo_id))];
  const { data: equipos } = await supabase.from("equipos").select("id, nombre").in("id", equipoIds);
  const nombresMap = new Map((equipos ?? []).map((e) => [e.id, e.nombre]));

  return filtered.map((r) => ({ ...r, equipo_nombre: nombresMap.get(r.equipo_id) }));
}

/** Accept invitation: insert equipo_miembros (player), update equipo_invitaciones estado = aceptada. Uses auth.uid() for usuario_id. */
export async function acceptTeamInvitation(invitationId: string, userId: string): Promise<{ error: string | null }> {
  console.log("Using table: equipo_invitaciones");
  const { data: { user } } = await supabase.auth.getUser();
  const authUserId = user?.id;
  if (!authUserId) return { error: "Debés estar logueado" };

  const { data: inv } = await supabase
    .from("equipo_invitaciones")
    .select("*")
    .eq("id", invitationId)
    .eq("estado", "pendiente")
    .single();
  if (!inv) return { error: "Invitación no encontrada o ya procesada" };

  const { data: usuario } = await supabase.from("usuarios").select("email").eq("id", authUserId).single();
  const userEmail = usuario?.email?.toLowerCase();
  if (userEmail !== inv.invitado_email && inv.invitado_id !== authUserId) {
    return { error: "Esta invitación no corresponde a tu cuenta" };
  }

  console.log("Inserting member with ID:", authUserId);
  const { error: errMember } = await supabase.from("equipo_miembros").insert({
    equipo_id: inv.equipo_id,
    usuario_id: authUserId,
    role: "player",
  });
  if (errMember) return { error: errMember.message };

  const { error: errUpdate } = await supabase
    .from("equipo_invitaciones")
    .update({ estado: "aceptada", invitado_id: authUserId })
    .eq("id", invitationId);
  if (errUpdate) return { error: errUpdate.message };

  return { error: null };
}

/** Reject invitation (equipo_invitaciones estado = rechazada) */
export async function rejectTeamInvitation(invitationId: string, userId: string): Promise<{ error: string | null }> {
  console.log("Using table: equipo_invitaciones");
  const { data: inv } = await supabase
    .from("equipo_invitaciones")
    .select("*")
    .eq("id", invitationId)
    .single();
  if (!inv) return { error: "Invitación no encontrada" };
  const { data: usuario } = await supabase.from("usuarios").select("email").eq("id", userId).single();
  const userEmail = usuario?.email?.toLowerCase();
  if (userEmail !== inv.invitado_email && inv.invitado_id !== userId) {
    return { error: "Esta invitación no corresponde a tu cuenta" };
  }
  const { error } = await supabase
    .from("equipo_invitaciones")
    .update({ estado: "rechazada" })
    .eq("id", invitationId);
  return { error: error?.message ?? null };
}

/** Captain removes a player from the team. Cannot remove captain. */
export async function removeMemberFromTeam(
  equipoId: string,
  memberUsuarioId: string,
  currentUserId: string
): Promise<{ error: string | null }> {
  const { data: miembros } = await supabase
    .from("equipo_miembros")
    .select("*")
    .eq("equipo_id", equipoId);
  const list = (miembros ?? []) as EquipoMiembro[];
  const captain = list.find((m) => m.role === "captain" || m.es_capitan);
  const toRemove = list.find((m) => m.usuario_id === memberUsuarioId);

  if (!toRemove) return { error: "El jugador no está en el equipo" };
  if (toRemove.role === "captain" || toRemove.es_capitan) return { error: "No se puede eliminar al capitán" };
  if (captain?.usuario_id !== currentUserId) return { error: "Solo el capitán puede eliminar jugadores" };

  const { error } = await supabase
    .from("equipo_miembros")
    .delete()
    .eq("equipo_id", equipoId)
    .eq("usuario_id", memberUsuarioId);
  return { error: error?.message ?? null };
}

/** Player leaves the team (delete self from equipo_miembros; cannot leave if captain) */
export async function leaveTeam(equipoId: string, userId: string): Promise<{ error: string | null }> {
  const { data: row } = await supabase
    .from("equipo_miembros")
    .select("role, es_capitan")
    .eq("equipo_id", equipoId)
    .eq("usuario_id", userId)
    .single();
  if (!row) return { error: "No formás parte de este equipo" };
  const isCaptain = row.role === "captain" || row.es_capitan;
  if (isCaptain) return { error: "El capitán no puede abandonar el equipo. Transferí el rol o eliminá el equipo." };

  const { error } = await supabase
    .from("equipo_miembros")
    .delete()
    .eq("equipo_id", equipoId)
    .eq("usuario_id", userId);
  return { error: error?.message ?? null };
}

/** Transfer captaincy to another player. Only current captain can do it. */
export async function transferCaptaincy(
  equipoId: string,
  newCaptainUsuarioId: string,
  currentUserId: string
): Promise<{ error: string | null }> {
  const { data: miembros } = await supabase
    .from("equipo_miembros")
    .select("*")
    .eq("equipo_id", equipoId);
  const list = (miembros ?? []) as EquipoMiembro[];
  const currentCaptain = list.find((m) => m.usuario_id === currentUserId);
  const newCaptain = list.find((m) => m.usuario_id === newCaptainUsuarioId);

  if (!currentCaptain || currentCaptain.role !== "captain") return { error: "Solo el capitán puede transferir el rol" };
  if (!newCaptain) return { error: "El jugador no está en el equipo" };
  if (newCaptain.usuario_id === currentUserId) return { error: "Ya sos el capitán" };

  const { error: err1 } = await supabase
    .from("equipo_miembros")
    .update({ role: "player" })
    .eq("equipo_id", equipoId)
    .eq("usuario_id", currentUserId);
  if (err1) return { error: err1.message };

  const { error: err2 } = await supabase
    .from("equipo_miembros")
    .update({ role: "captain" })
    .eq("equipo_id", equipoId)
    .eq("usuario_id", newCaptainUsuarioId);
  if (err2) return { error: err2.message };

  return { error: null };
}

/** Delete team. Only captain (or team creator) can delete. Cascade removes equipo_miembros. */
export async function deleteTeam(equipoId: string, userId: string): Promise<{ error: string | null }> {
  const { data: equipo } = await supabase.from("equipos").select("creado_por").eq("id", equipoId).single();
  if (!equipo) return { error: "Equipo no encontrado" };

  const { data: miembros } = await supabase
    .from("equipo_miembros")
    .select("usuario_id, role")
    .eq("equipo_id", equipoId);
  const list = (miembros ?? []) as { usuario_id: string; role: string }[];
  const captain = list.find((m) => m.role === "captain");

  const canDelete = equipo.creado_por === userId || captain?.usuario_id === userId;
  if (!canDelete) return { error: "Solo el capitán puede eliminar el equipo" };

  const { error } = await supabase.from("equipos").delete().eq("id", equipoId);
  return { error: error?.message ?? null };
}
