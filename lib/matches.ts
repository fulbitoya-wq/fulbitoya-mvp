import { supabase } from "@/lib/supabase";
import type { Match, MatchPlayer, MatchPlayerEstado, MatchTipo, MatchVisibilidad } from "@/lib/types";

const MATCH_CAPACITY: Record<MatchTipo, number> = {
  f5: 10,
  f7: 14,
  f9: 18,
  f11: 22,
};

export interface CreateMatchInput {
  tipo: MatchTipo;
  provincia_id: string;
  partido_id: string;
  localidad_id: string;
  direccion?: string | null;
  place_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  visibilidad: MatchVisibilidad;
}

export interface MatchPlayerWithUser extends MatchPlayer {
  usuarios?: { id: string; nombre: string | null; email: string } | null;
}

export interface MatchDetail {
  match: Match | null;
  players: MatchPlayerWithUser[];
  isOrganizer: boolean;
  myPlayerRow: MatchPlayerWithUser | null;
  organizer: { id: string; nombre: string | null; email: string } | null;
  location: { provincia: string | null; partido: string | null; localidad: string | null };
}

export interface PublicMatchCard {
  id: string;
  tipo: MatchTipo;
  fecha: string;
  hora_inicio: string;
  duracion_min: number;
  estado: Match["estado"];
  visibilidad: MatchVisibilidad;
  zona: string;
}

export async function createMatch(input: CreateMatchInput): Promise<{ data: Match | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Debés estar logueado." };

  const { data: created, error: createErr } = await supabase
    .from("match")
    .insert({
      organizer_id: user.id,
      tipo: input.tipo,
      provincia_id: input.provincia_id,
      partido_id: input.partido_id,
      localidad_id: input.localidad_id,
      fecha: input.fecha,
      hora_inicio: input.hora_inicio,
      duracion_min: input.duracion_min,
      visibilidad: input.visibilidad,
      direccion: input.direccion ?? null,
      place_id: input.place_id ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      estado: "pending",
    })
    .select("*")
    .single();

  if (createErr || !created) return { data: null, error: createErr?.message ?? "No se pudo crear el match." };

  const { error: organizerErr } = await supabase.from("match_players").insert({
    match_id: created.id,
    user_id: user.id,
    origen: "invitacion",
    estado: "confirmado",
  });

  if (organizerErr) {
    await supabase.from("match").delete().eq("id", created.id);
    return { data: null, error: organizerErr.message };
  }

  return { data: created as Match, error: null };
}

export async function getMyMatches(userId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("match_players")
    .select("match(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map((row) => {
      const nested = (row as { match?: unknown }).match;
      const m = Array.isArray(nested) ? nested[0] : nested;
      return (m ?? null) as Match | null;
    })
    .filter((m): m is Match => m !== null);
}

export async function getMatchById(matchId: string, userId: string): Promise<MatchDetail> {
  const { data: match, error: matchErr } = await supabase.from("match").select("*").eq("id", matchId).single();
  if (matchErr || !match) {
    return {
      match: null,
      players: [],
      isOrganizer: false,
      myPlayerRow: null,
      organizer: null,
      location: { provincia: null, partido: null, localidad: null },
    };
  }

  const { data: players } = await supabase
    .from("match_players")
    .select("id, match_id, user_id, invited_email, origen, estado, created_at, usuarios(id, nombre, email)")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  const normalizedPlayers = (players ?? []).map((p) => {
    const nested = p.usuarios as unknown;
    const u = Array.isArray(nested) ? nested[0] : nested;
    return {
      ...p,
      usuarios: (u ?? null) as { id: string; nombre: string | null; email: string } | null,
    } as MatchPlayerWithUser;
  });

  const { data: organizer } = await supabase
    .from("usuarios")
    .select("id, nombre, email")
    .eq("id", match.organizer_id)
    .maybeSingle();

  const [provinciaRes, partidoRes, localidadRes] = await Promise.all([
    supabase.from("provincias").select("nombre").eq("id", match.provincia_id).maybeSingle(),
    supabase.from("partidos").select("nombre").eq("id", match.partido_id).maybeSingle(),
    supabase.from("localidades").select("nombre").eq("id", match.localidad_id).maybeSingle(),
  ]);

  return {
    match: match as Match,
    players: normalizedPlayers,
    isOrganizer: match.organizer_id === userId,
    myPlayerRow: normalizedPlayers.find((p) => p.user_id === userId) ?? null,
    organizer: organizer ?? null,
    location: {
      provincia: provinciaRes.data?.nombre ?? null,
      partido: partidoRes.data?.nombre ?? null,
      localidad: localidadRes.data?.nombre ?? null,
    },
  };
}

export async function updateMatch(
  matchId: string,
  payload: Partial<Pick<Match, "tipo" | "provincia_id" | "partido_id" | "localidad_id" | "fecha" | "hora_inicio" | "duracion_min" | "estado" | "visibilidad">>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("match").update(payload).eq("id", matchId);
  return { error: error?.message ?? null };
}

export async function invitePlayerByUserId(
  matchId: string,
  userId: string
): Promise<{ error: string | null; invitedEmail?: string | null }> {
  const { data: invitedUser } = await supabase.from("usuarios").select("id, email").eq("id", userId).maybeSingle();
  if (!invitedUser) return { error: "Usuario no encontrado." };

  const { error } = await supabase.from("match_players").insert({
    match_id: matchId,
    user_id: userId,
    invited_email: invitedUser.email?.toLowerCase() ?? null,
    origen: "invitacion",
    estado: "invitado",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ese usuario ya está invitado o ya participa." };
    return { error: error.message };
  }
  return { error: null, invitedEmail: invitedUser.email };
}

export async function invitePlayerByEmail(
  matchId: string,
  email: string
): Promise<{ error: string | null; linkedUserId?: string | null; email: string }> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return { error: "El email es obligatorio.", email: emailNorm };

  const { data: existingUser } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", emailNorm)
    .maybeSingle();

  const { error } = await supabase.from("match_players").insert({
    match_id: matchId,
    user_id: existingUser?.id ?? null,
    invited_email: emailNorm,
    origen: "invitacion",
    estado: "invitado",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una invitación para ese email.", email: emailNorm };
    return { error: error.message, email: emailNorm };
  }

  return { error: null, linkedUserId: existingUser?.id ?? null, email: emailNorm };
}

export async function respondInvitation(
  matchPlayerId: string,
  estado: Extract<MatchPlayerEstado, "confirmado" | "rechazado">
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debés estar logueado." };

  const { data: me } = await supabase.from("usuarios").select("email").eq("id", user.id).maybeSingle();

  const { data: row } = await supabase
    .from("match_players")
    .select("id, user_id, invited_email")
    .eq("id", matchPlayerId)
    .maybeSingle();
  if (!row) return { error: "Invitación no encontrada." };

  const sameUser = row.user_id === user.id;
  const sameEmail = !!me?.email && !!row.invited_email && me.email.toLowerCase() === row.invited_email.toLowerCase();
  if (!sameUser && !sameEmail) return { error: "No podés responder esta invitación." };

  const payload: { estado: "confirmado" | "rechazado"; user_id?: string } = { estado };
  if (!row.user_id && sameEmail) payload.user_id = user.id;

  const { error } = await supabase.from("match_players").update(payload).eq("id", matchPlayerId);
  return { error: error?.message ?? null };
}

export async function removePlayerFromMatch(matchId: string, matchPlayerId: string): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debés estar logueado." };

  const { data: match } = await supabase.from("match").select("organizer_id").eq("id", matchId).maybeSingle();
  if (!match || match.organizer_id !== user.id) return { error: "Solo el organizador puede quitar jugadores." };

  const { data: target } = await supabase.from("match_players").select("user_id").eq("id", matchPlayerId).maybeSingle();
  if (!target) return { error: "Jugador no encontrado." };
  if (target.user_id === user.id) return { error: "El organizador no puede quitarse a sí mismo." };

  const { error } = await supabase.from("match_players").delete().eq("id", matchPlayerId);
  return { error: error?.message ?? null };
}

export async function requestJoinMatch(matchId: string): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debés estar logueado." };

  const { data: me } = await supabase.from("usuarios").select("email").eq("id", user.id).maybeSingle();

  const { error } = await supabase.from("match_players").insert({
    match_id: matchId,
    user_id: user.id,
    invited_email: me?.email?.toLowerCase() ?? null,
    origen: "solicitud",
    estado: "invitado",
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya enviaste una solicitud o ya participás en este match." };
    return { error: error.message };
  }

  return { error: null };
}

export async function reviewJoinRequest(
  matchId: string,
  matchPlayerId: string,
  estado: Extract<MatchPlayerEstado, "confirmado" | "rechazado">
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debés estar logueado." };

  const { data: match } = await supabase.from("match").select("organizer_id").eq("id", matchId).maybeSingle();
  if (!match || match.organizer_id !== user.id) return { error: "Solo el organizador puede revisar solicitudes." };

  const { error } = await supabase.from("match_players").update({ estado }).eq("id", matchPlayerId).eq("match_id", matchId);
  return { error: error?.message ?? null };
}

export async function leaveMatch(matchId: string): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debés estar logueado." };

  const { data: match } = await supabase.from("match").select("organizer_id").eq("id", matchId).maybeSingle();
  if (!match) return { error: "Match no encontrado." };
  if (match.organizer_id === user.id) return { error: "El organizador no puede salir del match." };

  const { error } = await supabase.from("match_players").delete().eq("match_id", matchId).eq("user_id", user.id);
  return { error: error?.message ?? null };
}

export async function cancelJoinRequest(matchId: string): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debés estar logueado." };

  const { error } = await supabase
    .from("match_players")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", user.id)
    .eq("origen", "solicitud")
    .eq("estado", "invitado");

  return { error: error?.message ?? null };
}

export function getMatchCapacity(tipo: MatchTipo): number {
  return MATCH_CAPACITY[tipo];
}

export async function getPublicMatches(limit = 6): Promise<PublicMatchCard[]> {
  const { data: matches, error } = await supabase
    .from("match")
    .select("id, tipo, fecha, hora_inicio, duracion_min, estado, visibilidad, provincia_id, partido_id, localidad_id")
    .eq("visibilidad", "publico")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true })
    .limit(limit);

  if (error || !matches?.length) return [];

  const provinciaIds = [...new Set(matches.map((m) => m.provincia_id).filter(Boolean))];
  const partidoIds = [...new Set(matches.map((m) => m.partido_id).filter(Boolean))];
  const localidadIds = [...new Set(matches.map((m) => m.localidad_id).filter(Boolean))];

  const [provinciasRes, partidosRes, localidadesRes] = await Promise.all([
    supabase.from("provincias").select("id, nombre").in("id", provinciaIds),
    supabase.from("partidos").select("id, nombre").in("id", partidoIds),
    supabase.from("localidades").select("id, nombre").in("id", localidadIds),
  ]);

  const provMap = new Map((provinciasRes.data ?? []).map((p) => [p.id, p.nombre]));
  const partMap = new Map((partidosRes.data ?? []).map((p) => [p.id, p.nombre]));
  const locMap = new Map((localidadesRes.data ?? []).map((l) => [l.id, l.nombre]));

  return matches.map((m) => {
    const zona = [locMap.get(m.localidad_id), partMap.get(m.partido_id), provMap.get(m.provincia_id)]
      .filter(Boolean)
      .join(", ");
    return {
      id: m.id,
      tipo: m.tipo as MatchTipo,
      fecha: m.fecha,
      hora_inicio: m.hora_inicio,
      duracion_min: m.duracion_min,
      estado: m.estado as Match["estado"],
      visibilidad: m.visibilidad as MatchVisibilidad,
      zona: zona || "Zona no definida",
    };
  });
}
