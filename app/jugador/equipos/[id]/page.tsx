"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getEquipoById,
  inviteToTeam,
  removeMemberFromTeam,
  leaveTeam,
  transferCaptaincy,
  deleteTeam,
  cancelTeamInvitation,
} from "@/lib/equipos";
import type { Equipo, EquipoMiembro, EquipoMiembroRole, EquipoInvitacion, Usuario } from "@/lib/types";

export default function EquipoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [miembros, setMiembros] = useState<(EquipoMiembro & { usuarios?: { nombre: string | null; email: string } | null })[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<EquipoInvitacion[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ usuario_id: string; name: string } | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setUserId(user.id);
    const data = await getEquipoById(id, user.id);
    setEquipo(data.equipo);
    setMiembros(data.miembros);
    setTeamInvitations(data.teamInvitations ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || role !== "captain" || !equipo) return;
    setInviteError(null);
    setInviteLoading(true);
    const { error } = await inviteToTeam(equipo.id, userId, inviteEmail);
    setInviteLoading(false);
    if (error) {
      setInviteError(error);
      return;
    }
    setInviteEmail("");
    load();
  };

  const handleCancelInvitationConfirm = async () => {
    if (!userId || !invitationToCancel) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await cancelTeamInvitation(invitationToCancel, userId);
    setActionLoading(false);
    if (error) setActionError(error);
    else {
      setFeedbackMessage("Invitación cancelada.");
      setFeedbackModalOpen(true);
      setCancelModalOpen(false);
      setInvitationToCancel(null);
      load();
    }
  };

  const handleResendInvitation = async (email: string) => {
    if (!equipo) return;
    try {
      await fetch("/api/send-invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          teamName: equipo.nombre,
          type: "unregistered",
        }),
      });
      setFeedbackMessage(`Invitación reenviada a ${email}`);
      setFeedbackModalOpen(true);
    } catch (e) {
      console.error("Error re-sending invite email:", e);
      setFeedbackMessage("No se pudo reenviar la invitación. Intentá de nuevo.");
      setFeedbackModalOpen(true);
    }
  };

  const handleRemove = async (memberUsuarioId: string) => {
    if (!userId || !equipo) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await removeMemberFromTeam(equipo.id, memberUsuarioId, userId);
    setActionLoading(false);
    if (error) setActionError(error);
    else {
      setRemoveModalOpen(false);
      setSelectedPlayer(null);
      load();
    }
  };

  const handleConfirmRemove = () => {
    if (selectedPlayer) handleRemove(selectedPlayer.usuario_id);
  };

  const handleMakeCaptain = async (newCaptainUsuarioId: string) => {
    if (!userId || !equipo || role !== "captain") return;
    if (!confirm("¿Transferir la capitanía a este jugador? Vos pasás a ser jugador.")) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await transferCaptaincy(equipo.id, newCaptainUsuarioId, userId);
    setActionLoading(false);
    if (error) setActionError(error);
    else load();
  };

  const handleDeleteTeam = async () => {
    if (!userId || !equipo) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await deleteTeam(equipo.id, userId);
    setActionLoading(false);
    if (error) setActionError(error);
    else router.push("/jugador/equipos");
  };

  const handleLeave = async () => {
    if (!userId || !equipo) return;
    if (!confirm("¿Salir de este equipo?")) return;
    setActionError(null);
    setActionLoading(true);
    const { error } = await leaveTeam(equipo.id, userId);
    setActionLoading(false);
    if (error) setActionError(error);
    else router.push("/jugador/equipos");
  };

  // Current user role from equipo_miembros
  const currentMember = miembros.find((m) => m.usuario_id === userId);
  const role: EquipoMiembroRole | null = currentMember?.role ?? null;
  const isCaptain = role === "captain";

  const tipoTexto: Record<number, string> = {
    5: "Fútbol 5",
    7: "Fútbol 7",
    11: "Fútbol 11",
  };

  // Debug: verify role and members from equipo_miembros
  if (!loading && equipo) {
    console.log("USER ROLE:", role);
    console.log("MEMBERS:", miembros);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-[#1A2E4A]/70">Cargando...</p>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-red-700">Equipo no encontrado.</p>
        <Link href="/jugador/equipos" className="mt-2 inline-block text-sm font-medium underline">
          Volver a equipos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador/equipos" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a equipos
      </Link>

      <div className="mt-4 rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {/* 1. Team information */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5] text-[#1A2E4A]/50 overflow-hidden">
            {((equipo as any).logo_url ?? equipo.uniforme_imagen_url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(equipo as any).logo_url ?? equipo.uniforme_imagen_url}
                alt={`Logo del equipo ${equipo.nombre}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">?</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
              {equipo.nombre}
            </h1>
            {equipo.ciudad && <p className="mt-1 text-[#1A2E4A]/70">{equipo.ciudad}</p>}
            {equipo.tipo_equipo && (
              <p className="mt-1 text-sm text-[#1A2E4A]/70">Tipo: {tipoTexto[equipo.tipo_equipo]}</p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-[#1A2E4A]/70">Uniforme:</span>
              <div className="flex items-center gap-2">
                {equipo.color_primario && (
                  <span
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: equipo.color_primario }}
                    aria-label="Color principal"
                  />
                )}
                {equipo.color_secundario && (
                  <span
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: equipo.color_secundario }}
                    aria-label="Color secundario"
                  />
                )}
              </div>
            </div>

            <p className="mt-1 text-sm text-[#1A2E4A]/70">
              Jugadores: {miembros.length} / {equipo.capacidad_max ?? "∞"}
            </p>
            {isCaptain && (
              <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Capitán
              </span>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800">{actionError}</div>
        )}

        {/* Team Actions (captain only) */}
        {isCaptain && (
          <div className="mt-6 border-t border-[#E0E0E0] pt-6">
            <h2 className="font-subheading text-lg font-semibold text-[#1A2E4A]">Acciones del equipo</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {/* Invite Player - always visible for captain */}
              <div className="flex flex-wrap items-center gap-2">
                <form onSubmit={handleInvite} className="flex flex-wrap items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
                  />
                  <button
                    type="submit"
                    disabled={inviteLoading || actionLoading}
                    className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
                  >
                    {inviteLoading ? "Enviando..." : "Invitar jugador"}
                  </button>
                </form>
                {inviteError && <span className="text-sm text-red-800">{inviteError}</span>}
              </div>
              {/* Delete Team */}
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                disabled={actionLoading}
                className="rounded-full border border-red-500 bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
              >
                Eliminar equipo
              </button>
            </div>
            {teamInvitations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-[#1A2E4A]/80">Invitaciones pendientes</p>
                <ul className="mt-1 space-y-1 text-sm text-[#1A2E4A]/70">
                  {teamInvitations.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2">
                      <span>{inv.invitado_email}</span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendInvitation(inv.invitado_email)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#1A2E4A]/15 bg-[#1A2E4A]/5 px-3 py-1 text-xs font-semibold text-[#1A2E4A] transition hover:bg-[#1A2E4A]/10"
                        >
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 10a6 6 0 0110.39-4.19L16 4v4h-4l1.85-1.85A4 4 0 006 10a4 4 0 004 4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Reenviar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInvitationToCancel(inv.id);
                            setCancelModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-red-500 bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-200"
                        >
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M5 5l10 10M15 5L5 15"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Cancelar
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="mt-6 border-t border-[#E0E0E0] pt-6">
          <h2 className="font-subheading text-lg font-semibold text-[#1A2E4A]">Jugadores</h2>
          <ul className="mt-2 space-y-2">
            {miembros.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-3"
              >
                <span>
                  {m.usuarios?.nombre || m.usuarios?.email || "Usuario"}
                  <span className="ml-2 text-xs font-medium text-[#1A2E4A]/70">
                    {m.role === "captain" ? "Capitán" : "Jugador"}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {isCaptain && m.role !== "captain" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMakeCaptain(m.usuario_id)}
                        disabled={actionLoading}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        Hacer capitán
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlayer({
                            usuario_id: m.usuario_id,
                            name: m.usuarios?.nombre || m.usuarios?.email || "Usuario",
                          });
                          setRemoveModalOpen(true);
                        }}
                        disabled={actionLoading}
                        className="rounded-lg border border-red-500 bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
                      >
                        Quitar jugador
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Player: leave team */}
          {!isCaptain && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleLeave}
                disabled={actionLoading}
                className="rounded-lg border border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
              >
                Salir del equipo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Remove player confirmation modal */}
      {removeModalOpen && selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !actionLoading && (setRemoveModalOpen(false), setSelectedPlayer(null))}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-xl">
            <p className="text-[#1A2E4A]">
              ¿Estás seguro que deseas quitar a <strong>{selectedPlayer.name}</strong> del equipo?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !actionLoading && (setRemoveModalOpen(false), setSelectedPlayer(null))}
                disabled={actionLoading}
                className="rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Quitando..." : "Quitar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete team confirmation modal */}
      {isOpen && equipo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !actionLoading && setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-xl">
            <p className="text-[#1A2E4A]">
              ¿Estás seguro que deseas eliminar el equipo <strong>{equipo.nombre}</strong>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !actionLoading && setIsOpen(false)}
                disabled={actionLoading}
                className="rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Eliminando..." : "Confirmar eliminación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel invitation confirmation modal */}
      {cancelModalOpen && invitationToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => !actionLoading && setCancelModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-[#1A2E4A]">Cancelar invitación</p>
            <p className="mt-2 text-sm text-[#1A2E4A]/80">
              ¿Estás seguro que querés cancelar esta invitación pendiente? El jugador ya no podrá usar este enlace para unirse al equipo.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !actionLoading && setCancelModalOpen(false)}
                disabled={actionLoading}
                className="rounded-full border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5] disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCancelInvitationConfirm}
                disabled={actionLoading}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal for resend/cancel success */}
      {feedbackModalOpen && feedbackMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setFeedbackModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                ✓
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1A2E4A]">Acción completada</p>
                <p className="mt-1 text-sm text-[#1A2E4A]/80">{feedbackMessage}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="rounded-full bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--fulbito-green-hover)]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
