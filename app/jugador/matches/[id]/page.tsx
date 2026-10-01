"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  cancelJoinRequest,
  getMatchById,
  getMatchCapacity,
  invitePlayerByEmail,
  invitePlayerByUserId,
  leaveMatch,
  removePlayerFromMatch,
  respondInvitation,
  reviewJoinRequest,
  requestJoinMatch,
  updateMatch,
} from "@/lib/matches";
import type { MatchPlayerWithUser } from "@/lib/matches";
import type { Match, MatchTipo, MatchVisibilidad } from "@/lib/types";

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [organizer, setOrganizer] = useState<{ id: string; nombre: string | null; email: string } | null>(null);
  const [location, setLocation] = useState<{ provincia: string | null; partido: string | null; localidad: string | null }>({
    provincia: null,
    partido: null,
    localidad: null,
  });
  const [players, setPlayers] = useState<MatchPlayerWithUser[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);

  const [editTipo, setEditTipo] = useState<MatchTipo>("f5");
  const [editFecha, setEditFecha] = useState("");
  const [editHora, setEditHora] = useState("");
  const [editDuracion, setEditDuracion] = useState(60);
  const [editVisibilidad, setEditVisibilidad] = useState<MatchVisibilidad>("publico");
  const [editEstado, setEditEstado] = useState<"pending" | "completo" | "confirmado" | "cancelado">("pending");

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setUserId(user.id);

    const detail = await getMatchById(matchId, user.id);
    setMatch(detail.match);
    setPlayers(detail.players);
    setIsOrganizer(detail.isOrganizer);
    setMyPlayerId(detail.myPlayerRow?.id ?? null);
    setOrganizer(detail.organizer);
    setLocation(detail.location);

    if (detail.match) {
      setEditTipo(detail.match.tipo);
      setEditFecha(detail.match.fecha);
      setEditHora(detail.match.hora_inicio.slice(0, 5));
      setEditDuracion(detail.match.duracion_min);
      setEditVisibilidad(detail.match.visibilidad);
      setEditEstado(detail.match.estado);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [matchId]);

  const confirmedCount = useMemo(() => players.filter((p) => p.estado === "confirmado").length, [players]);
  const capacity = match ? getMatchCapacity(match.tipo) : 0;
  const myPlayerRow = players.find((p) => p.id === myPlayerId) ?? null;

  const handleInviteByUserId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !isOrganizer) return;
    setInviting(true);
    setActionError(null);
    setFeedback(null);
    const { error, invitedEmail } = await invitePlayerByUserId(match.id, inviteUserId.trim());
    setInviting(false);
    if (error) {
      setActionError(error);
      return;
    }
    if (invitedEmail) {
      await fetch("/api/send-match-invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: invitedEmail, matchId: match.id }),
      });
    }
    setInviteUserId("");
    setFeedback("Jugador invitado correctamente.");
    load();
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !isOrganizer) return;
    setInviting(true);
    setActionError(null);
    setFeedback(null);
    const result = await invitePlayerByEmail(match.id, inviteEmail);
    setInviting(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    await fetch("/api/send-match-invite-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: result.email, matchId: match.id }),
    });
    setInviteEmail("");
    setFeedback("Invitación por email enviada.");
    load();
  };

  const handleRespond = async (estado: "confirmado" | "rechazado") => {
    if (!myPlayerId) return;
    setActionError(null);
    const { error } = await respondInvitation(myPlayerId, estado);
    if (error) {
      setActionError(error);
      return;
    }
    setFeedback(estado === "confirmado" ? "Invitación aceptada." : "Invitación rechazada.");
    load();
  };

  const handleRemove = async (matchPlayerId: string) => {
    if (!match) return;
    setActionError(null);
    const { error } = await removePlayerFromMatch(match.id, matchPlayerId);
    if (error) {
      setActionError(error);
      return;
    }
    setFeedback("Jugador removido.");
    load();
  };

  const handleLeave = async () => {
    if (!match) return;
    if (!confirm("¿Salir del match?")) return;
    setActionError(null);
    const { error } = await leaveMatch(match.id);
    if (error) {
      setActionError(error);
      return;
    }
    router.push("/jugador/matches");
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !isOrganizer) return;
    setSavingMatch(true);
    setActionError(null);
    const { error } = await updateMatch(match.id, {
      tipo: editTipo,
      fecha: editFecha,
      hora_inicio: editHora,
      duracion_min: editDuracion,
      visibilidad: editVisibilidad,
      estado: editEstado,
    });
    setSavingMatch(false);
    if (error) {
      setActionError(error);
      return;
    }
    setFeedback("Match actualizado.");
    load();
  };

  const handleRequestJoin = async () => {
    if (!match) return;
    setActionError(null);
    const { error } = await requestJoinMatch(match.id);
    if (error) {
      setActionError(error);
      return;
    }
    setFeedback("Solicitud enviada. El organizador debe aprobarla.");
    load();
  };

  const handleReviewRequest = async (matchPlayerId: string, estado: "confirmado" | "rechazado") => {
    if (!match) return;
    setActionError(null);
    const { error } = await reviewJoinRequest(match.id, matchPlayerId, estado);
    if (error) {
      setActionError(error);
      return;
    }
    setFeedback(estado === "confirmado" ? "Solicitud aprobada." : "Solicitud rechazada.");
    load();
  };

  const handleCancelMyRequest = async () => {
    if (!match) return;
    setActionError(null);
    const { error } = await cancelJoinRequest(match.id);
    if (error) {
      setActionError(error);
      return;
    }
    setFeedback("Solicitud cancelada.");
    load();
  };

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10 text-[#1A2E4A]/70">Cargando...</div>;
  if (!match) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-red-700">Match no encontrado.</p>
        <Link href="/jugador/matches" className="mt-3 inline-block text-sm font-medium underline">Volver</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador/matches" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">← Volver a matches</Link>

      <div className="mt-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">Match {match.tipo.toUpperCase()}</h1>
        <p className="mt-1 text-sm text-[#1A2E4A]/70">Organizador: {organizer?.nombre || organizer?.email || match.organizer_id}</p>
        <p className="text-sm text-[#1A2E4A]/70">Fecha: {match.fecha} - {match.hora_inicio.slice(0, 5)} ({match.duracion_min} min)</p>
        <p className="text-sm text-[#1A2E4A]/70">Estado: {match.estado} | Visibilidad: {match.visibilidad}</p>
        <p className="text-sm text-[#1A2E4A]/70">
          Zona: {[location.localidad, location.partido, location.provincia].filter(Boolean).join(", ") || "No definida"}
        </p>
        <p className="mt-2 text-sm font-medium text-[#1A2E4A]">Jugadores: {confirmedCount}/{capacity}</p>

        {actionError && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}
        {feedback && <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>}

        {!isOrganizer && !myPlayerRow && (
          <div className="mt-6 border-t border-[#E0E0E0] pt-6">
            <h2 className="text-lg font-semibold text-[#1A2E4A]">Unirme al match</h2>
            <p className="mt-1 text-sm text-[#1A2E4A]/75">
              Enviá una solicitud de unión. El organizador la aprobará o rechazará.
            </p>
            <button
              onClick={handleRequestJoin}
              className="mt-3 rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white"
            >
              Solicitar unirme
            </button>
          </div>
        )}

        {isOrganizer && (
          <div className="mt-6 space-y-6 border-t border-[#E0E0E0] pt-6">
            <form onSubmit={handleSaveMatch} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-lg font-semibold text-[#1A2E4A]">Editar match</h2>
              <select value={editTipo} onChange={(e) => setEditTipo(e.target.value as MatchTipo)} className="rounded-lg border border-[#E0E0E0] px-3 py-2">
                <option value="f5">Fútbol 5</option>
                <option value="f7">Fútbol 7</option>
                <option value="f9">Fútbol 9</option>
                <option value="f11">Fútbol 11</option>
              </select>
              <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className="rounded-lg border border-[#E0E0E0] px-3 py-2" />
              <input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} className="rounded-lg border border-[#E0E0E0] px-3 py-2" />
              <input type="number" min={30} step={15} value={editDuracion} onChange={(e) => setEditDuracion(Number(e.target.value))} className="rounded-lg border border-[#E0E0E0] px-3 py-2" />
              <select value={editVisibilidad} onChange={(e) => setEditVisibilidad(e.target.value as MatchVisibilidad)} className="rounded-lg border border-[#E0E0E0] px-3 py-2">
                <option value="publico">Público</option>
                <option value="privado">Privado</option>
              </select>
              <select value={editEstado} onChange={(e) => setEditEstado(e.target.value as "pending" | "completo" | "confirmado" | "cancelado")} className="rounded-lg border border-[#E0E0E0] px-3 py-2">
                <option value="pending">pending</option>
                <option value="completo">completo</option>
                <option value="confirmado">confirmado</option>
                <option value="cancelado">cancelado</option>
              </select>
              <button type="submit" disabled={savingMatch} className="sm:col-span-2 rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white disabled:opacity-70">
                {savingMatch ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <form onSubmit={handleInviteByUserId} className="rounded-lg border border-[#E0E0E0] p-4">
                <p className="text-sm font-semibold text-[#1A2E4A]">Invitar por user_id</p>
                <input value={inviteUserId} onChange={(e) => setInviteUserId(e.target.value)} placeholder="UUID del usuario" className="mt-2 w-full rounded-lg border border-[#E0E0E0] px-3 py-2" />
                <button type="submit" disabled={inviting} className="mt-3 rounded-lg bg-[#1A2E4A] px-4 py-2 text-sm font-medium text-white disabled:opacity-70">
                  {inviting ? "Invitando..." : "Invitar usuario"}
                </button>
              </form>

              <form onSubmit={handleInviteByEmail} className="rounded-lg border border-[#E0E0E0] p-4">
                <p className="text-sm font-semibold text-[#1A2E4A]">Invitar por email</p>
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" className="mt-2 w-full rounded-lg border border-[#E0E0E0] px-3 py-2" />
                <button type="submit" disabled={inviting} className="mt-3 rounded-lg bg-[#1A2E4A] px-4 py-2 text-sm font-medium text-white disabled:opacity-70">
                  {inviting ? "Invitando..." : "Invitar email"}
                </button>
              </form>
            </div>
          </div>
        )}

        {!isOrganizer && myPlayerId && (
          <div className="mt-6 border-t border-[#E0E0E0] pt-6">
            <h2 className="text-lg font-semibold text-[#1A2E4A]">Tu invitación</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {myPlayerRow?.estado === "invitado" && myPlayerRow?.origen === "invitacion" && (
                <>
                  <button onClick={() => handleRespond("confirmado")} className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white">
                    Aceptar invitación
                  </button>
                  <button onClick={() => handleRespond("rechazado")} className="rounded-lg border border-red-500 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                    Rechazar invitación
                  </button>
                </>
              )}
              {myPlayerRow?.estado === "invitado" && myPlayerRow?.origen === "solicitud" && (
                <button onClick={handleCancelMyRequest} className="rounded-lg border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                  Cancelar solicitud de unirme
                </button>
              )}
              {myPlayerRow?.estado === "confirmado" && (
                <button onClick={handleLeave} className="rounded-lg border border-[#E0E0E0] px-4 py-2 text-sm font-medium text-[#1A2E4A]">
                  Salir del match
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-[#E0E0E0] pt-6">
          <h2 className="text-lg font-semibold text-[#1A2E4A]">Jugadores</h2>
          <ul className="mt-3 space-y-2">
            {players.map((p) => {
              const displayName = p.usuarios?.nombre || p.usuarios?.email || p.invited_email || "Jugador";
              const statusClass =
                p.estado === "confirmado"
                  ? "bg-emerald-100 text-emerald-800"
                  : p.estado === "invitado"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800";
              return (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-[#E0E0E0] px-4 py-3">
                  <span className="text-sm text-[#1A2E4A]">
                    {displayName}{" "}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${statusClass}`}>{p.estado}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {isOrganizer && p.estado === "invitado" && p.user_id !== userId && (
                      <>
                        <button
                          onClick={() => handleReviewRequest(p.id, "confirmado")}
                          className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={() => handleReviewRequest(p.id, "rechazado")}
                          className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {isOrganizer && p.user_id !== userId && (
                      <button onClick={() => handleRemove(p.id)} className="rounded-lg border border-red-500 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                        Quitar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
