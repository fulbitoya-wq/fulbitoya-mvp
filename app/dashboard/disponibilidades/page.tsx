"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCanchasDelOwner, type Cancha } from "@/lib/canchas";
import { getCamposByCancha, type Campo } from "@/lib/campos";
import {
  enlacePredioWeb,
  enlaceReclamoWeb,
  mensajeErrorEquipo,
  mensajeWhatsappReserva,
  rpcAgendaReservasDia,
  rpcCargarReservaManual,
  rpcCrearEnlacePago,
  rpcSlugDeCancha,
} from "@shared/equipos";

type Disponibilidad = {
  id: string;
  campo_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  estado: "disponible" | "reservado" | "bloqueado";
};

type AgendaReserva = {
  disponibilidad_id: string;
  reserva_id: string;
  titular_nombre: string;
  titular_telefono: string;
  canal: string | null;
  cobro_externo: string | null;
};

type AgendaEnlace = {
  disponibilidad_id: string;
  token: string;
  titular_nombre: string;
  titular_telefono: string;
  monto_sena: number;
  mensaje: string;
};

const PLC_WEB = (process.env.NEXT_PUBLIC_PLC_SITE_URL ?? "https://porlacancha.com").replace(/\/$/, "");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function eachDateISO(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${fromISO}T00:00:00`);
  const end = new Date(`${toISO}T00:00:00`);
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export default function DashboardDisponibilidadesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidad[]>([]);
  const [agenda, setAgenda] = useState<Record<string, AgendaReserva>>({});
  const [enlaces, setEnlaces] = useState<Record<string, AgendaEnlace[]>>({});
  const [cargarId, setCargarId] = useState<string | null>(null);
  const [formModo, setFormModo] = useState<"pago" | "manual">("pago");
  const [cargarNombre, setCargarNombre] = useState("");
  const [cargarTel, setCargarTel] = useState("");
  const [cargarSena, setCargarSena] = useState("");
  const [cargarMsg, setCargarMsg] = useState("");
  const [cobroExterno, setCobroExterno] = useState<"sena_fuera" | "a_cobrar_predio">("sena_fuera");
  const [predioSlug, setPredioSlug] = useState<string | null>(null);

  const [canchaId, setCanchaId] = useState<string>("");
  const [campoId, setCampoId] = useState<string>("");
  const [fecha, setFecha] = useState<string>(todayISO());
  const [horaInicio, setHoraInicio] = useState<string>("18:00");
  const [horaFin, setHoraFin] = useState<string>("23:00");
  const [precio, setPrecio] = useState<string>("40000");
  const [intervaloMin, setIntervaloMin] = useState<string>("60");
  const [modo, setModo] = useState<"dia" | "rango">("dia");
  const [fechaDesde, setFechaDesde] = useState<string>(todayISO());
  const [fechaHasta, setFechaHasta] = useState<string>(todayISO());
  const [diasSemana, setDiasSemana] = useState<Record<string, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
  });

  const selectedCampo = useMemo(
    () => campos.find((c) => c.id === campoId) ?? null,
    [campos, campoId]
  );

  const loadDisponibilidades = async (selectedCampoId: string, selectedFecha: string) => {
    if (!selectedCampoId || !selectedFecha) {
      setDisponibilidades([]);
      return;
    }

    const { data, error: dispErr } = await supabase
      .from("disponibilidades")
      .select("id, campo_id, fecha, hora_inicio, hora_fin, precio, estado")
      .eq("campo_id", selectedCampoId)
      .eq("fecha", selectedFecha)
      .order("hora_inicio", { ascending: true });

    if (dispErr) {
      setError(dispErr.message);
      setDisponibilidades([]);
      setAgenda({});
      return;
    }

    setDisponibilidades((data ?? []) as Disponibilidad[]);

    const res = await rpcAgendaReservasDia(supabase, selectedCampoId, selectedFecha);
    if (!res.ok) {
      setAgenda({});
      return;
    }
    const map: Record<string, AgendaReserva> = {};
    for (const raw of res.reservas) {
      const id = String(raw.disponibilidad_id ?? "");
      if (!id) continue;
      map[id] = {
        disponibilidad_id: id,
        reserva_id: String(raw.reserva_id ?? ""),
        titular_nombre: String(raw.titular_nombre ?? ""),
        titular_telefono: String(raw.titular_telefono ?? ""),
        canal: raw.canal == null ? null : String(raw.canal),
        cobro_externo: raw.cobro_externo == null ? null : String(raw.cobro_externo),
      };
    }
    setAgenda(map);
    const emap: Record<string, AgendaEnlace[]> = {};
    const rawEnlaces = res.enlaces;
    for (const raw of rawEnlaces as Record<string, unknown>[]) {
      const id = String(raw.disponibilidad_id ?? "");
      if (!id) continue;
      const row: AgendaEnlace = {
        disponibilidad_id: id,
        token: String(raw.token ?? ""),
        titular_nombre: String(raw.titular_nombre ?? ""),
        titular_telefono: String(raw.titular_telefono ?? ""),
        monto_sena: Number(raw.monto_sena ?? 0),
        mensaje: String(raw.mensaje ?? ""),
      };
      emap[id] = [...(emap[id] ?? []), row];
    }
    setEnlaces(emap);
  };

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Debés estar logueado.");
        setLoading(false);
        return;
      }

      const ownerCanchas = await getCanchasDelOwner(user.id);
      setCanchas(ownerCanchas);

      if (ownerCanchas.length > 0) {
        const firstCanchaId = ownerCanchas[0].id;
        setCanchaId(firstCanchaId);
        const slugRes = await rpcSlugDeCancha(supabase, firstCanchaId);
        setPredioSlug(slugRes.ok ? slugRes.slug ?? null : null);

        const fields = await getCamposByCancha(firstCanchaId);
        setCampos(fields);

        if (fields.length > 0) {
          const firstCampoId = fields[0].id;
          setCampoId(firstCampoId);
          await loadDisponibilidades(firstCampoId, fecha);
        }
      }

      setLoading(false);
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCanchaChange = async (nextCanchaId: string) => {
    setCanchaId(nextCanchaId);
    setCampoId("");
    setDisponibilidades([]);
    setError(null);
    setPredioSlug(null);

    if (!nextCanchaId) {
      setCampos([]);
      return;
    }

    const slugRes = await rpcSlugDeCancha(supabase, nextCanchaId);
    setPredioSlug(slugRes.ok ? slugRes.slug ?? null : null);

    const fields = await getCamposByCancha(nextCanchaId);
    setCampos(fields);
    if (fields.length > 0) {
      const firstCampoId = fields[0].id;
      setCampoId(firstCampoId);
      await loadDisponibilidades(firstCampoId, fecha);
    }
  };

  const onCampoChange = async (nextCampoId: string) => {
    setCampoId(nextCampoId);
    setError(null);
    await loadDisponibilidades(nextCampoId, fecha);
  };

  const onFechaChange = async (nextFecha: string) => {
    setFecha(nextFecha);
    setError(null);
    await loadDisponibilidades(campoId, nextFecha);
  };

  const crearDisponibilidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campoId) {
      setError("Seleccioná un campo.");
      return;
    }

    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setError("Ingresá un precio válido.");
      return;
    }
    if (!horaInicio || !horaFin || horaFin <= horaInicio) {
      setError("Ingresá un rango horario válido.");
      return;
    }
    const intervalo = Number(intervaloMin);
    if (![30, 60, 90, 120].includes(intervalo)) {
      setError("Seleccioná un intervalo válido.");
      return;
    }

    setSaving(true);
    setError(null);

    const ini = timeToMinutes(horaInicio);
    const fin = timeToMinutes(horaFin);
    if (fin - ini < intervalo) {
      setSaving(false);
      setError("El rango debe ser mayor o igual al intervalo elegido.");
      return;
    }

    const fechasObjetivo =
      modo === "dia"
        ? [fecha]
        : eachDateISO(fechaDesde, fechaHasta).filter((d) => {
            const weekday = new Date(`${d}T00:00:00`).getDay();
            return Boolean(diasSemana[String(weekday)]);
          });

    if (fechasObjetivo.length === 0) {
      setSaving(false);
      setError("Seleccioná al menos un día de la semana dentro del rango.");
      return;
    }

    const nuevos: Array<{
      campo_id: string;
      fecha: string;
      hora_inicio: string;
      hora_fin: string;
      precio: number;
      estado: "disponible";
    }> = [];

    for (const fechaItem of fechasObjetivo) {
      for (let t = ini; t + intervalo <= fin; t += intervalo) {
        nuevos.push({
          campo_id: campoId,
          fecha: fechaItem,
          hora_inicio: minutesToTime(t),
          hora_fin: minutesToTime(t + intervalo),
          precio: precioNum,
          estado: "disponible",
        });
      }
    }

    const fromDate = modo === "dia" ? fecha : fechaDesde;
    const toDate = modo === "dia" ? fecha : fechaHasta;
    const { data: existentes, error: existentesErr } = await supabase
      .from("disponibilidades")
      .select("fecha, hora_inicio, hora_fin")
      .eq("campo_id", campoId)
      .gte("fecha", fromDate)
      .lte("fecha", toDate);

    if (existentesErr) {
      setSaving(false);
      setError(existentesErr.message);
      return;
    }

    const sinSolapes = nuevos.filter((n) => {
      const nIni = timeToMinutes(n.hora_inicio);
      const nFin = timeToMinutes(n.hora_fin);
      return !(existentes ?? []).some((e: any) => {
        if (e.fecha !== n.fecha) return false;
        const eIni = timeToMinutes(e.hora_inicio);
        const eFin = timeToMinutes(e.hora_fin);
        return nIni < eFin && eIni < nFin;
      });
    });

    if (sinSolapes.length === 0) {
      setSaving(false);
      setError("Ese rango ya está ocupado por horarios existentes.");
      return;
    }

    const { error: insertErr } = await supabase.from("disponibilidades").insert(sinSolapes);

    setSaving(false);

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    await loadDisponibilidades(campoId, fecha);
  };

  const cambiarEstado = async (id: string, estado: "disponible" | "bloqueado") => {
    const { error: updErr } = await supabase
      .from("disponibilidades")
      .update({ estado })
      .eq("id", id);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    await loadDisponibilidades(campoId, fecha);
  };

  const borrarDisponibilidad = async (id: string) => {
    const { error: delErr } = await supabase.from("disponibilidades").delete().eq("id", id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await loadDisponibilidades(campoId, fecha);
  };

  const whatsappHref = (e: AgendaEnlace, d: Disponibilidad) => {
    const link = enlaceReclamoWeb(PLC_WEB, e.token);
    const text =
      e.mensaje.trim() ||
      mensajeWhatsappReserva({
        nombre: e.titular_nombre,
        fecha,
        hora: formatTime(d.hora_inicio),
        predio: canchas.find((c) => c.id === canchaId)?.nombre ?? "el predio",
        link,
        sena: e.monto_sena,
      });
    const tel = e.titular_telefono.replace(/\D/g, "");
    return `https://wa.me/${tel}?text=${encodeURIComponent(text)}`;
  };

  const senaDefault = () => {
    const n = Number(selectedCampo?.valor_reserva ?? canchas.find((c) => c.id === canchaId)?.valor_reserva ?? 0);
    return Number.isFinite(n) && n > 0 ? String(n) : "";
  };

  const abrirFormPago = (id: string) => {
    setCargarId(id);
    setFormModo("pago");
    setCargarNombre("");
    setCargarTel("");
    setCargarSena(senaDefault());
    const predio = canchas.find((c) => c.id === canchaId)?.nombre ?? "el predio";
    const slot = disponibilidades.find((x) => x.id === id);
    setCargarMsg(
      mensajeWhatsappReserva({
        nombre: "[nombre]",
        fecha,
        hora: slot ? formatTime(slot.hora_inicio) : "",
        predio,
        link: "[enlace]",
        sena: Number(senaDefault() || 0),
      })
    );
  };

  const crearEnlace = async (disponibilidadId: string) => {
    setSaving(true);
    setError(null);
    const msg = cargarMsg.replaceAll("[nombre]", cargarNombre);
    const res = await rpcCrearEnlacePago(supabase, {
      disponibilidadId,
      nombre: cargarNombre,
      telefono: cargarTel,
      montoSena: Number(cargarSena),
      mensaje: msg,
    });
    setSaving(false);
    if (!res.ok) {
      setError(mensajeErrorEquipo(res.error));
      return;
    }
    setCargarId(null);
    await loadDisponibilidades(campoId, fecha);
  };

  const cargarManual = async (disponibilidadId: string) => {
    setSaving(true);
    setError(null);
    const res = await rpcCargarReservaManual(supabase, disponibilidadId, cargarNombre, cargarTel, cobroExterno);
    setSaving(false);
    if (!res.ok) {
      setError(mensajeErrorEquipo(res.error));
      return;
    }
    setCargarId(null);
    await loadDisponibilidades(campoId, fecha);
  };

  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
        Agenda
      </h1>
      <p className="mt-1 text-[#1A2E4A]/70">
        Cargá turnos por campo. El enlace de WhatsApp no bloquea el horario hasta que paguen.
      </p>
      {predioSlug ? (
        <p className="mt-2 text-sm text-[#1A2E4A]/80">
          Link general del predio:{" "}
          <a className="font-medium underline" href={enlacePredioWeb(PLC_WEB, predioSlug)} target="_blank" rel="noreferrer">
            {enlacePredioWeb(PLC_WEB, predioSlug)}
          </a>
        </p>
      ) : null}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-[#1A2E4A]/70">Cargando...</p>
      ) : (
        <>
          <form
            onSubmit={crearDisponibilidad}
            className="mt-6 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Predio</label>
                <select
                  value={canchaId}
                  onChange={(e) => onCanchaChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                >
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Campo</label>
                <select
                  value={campoId}
                  onChange={(e) => onCampoChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                >
                  {campos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.tipo ?? "—"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  min={todayISO()}
                  onChange={(e) => onFechaChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Modo</label>
                <select
                  value={modo}
                  onChange={(e) => setModo(e.target.value as "dia" | "rango")}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                >
                  <option value="dia">Solo este día</option>
                  <option value="rango">Repetir por rango</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Hora inicio</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Hora fin</label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Intervalo</label>
                <select
                  value={intervaloMin}
                  onChange={(e) => setIntervaloMin(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                >
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A2E4A]">Precio por hora</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                />
              </div>
            </div>

            {modo === "rango" && (
              <div className="mt-4 rounded-lg border border-[#E0E0E0] bg-[#F9F9F9] p-4">
                <p className="text-sm font-medium text-[#1A2E4A]">Repetición semanal</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[#1A2E4A]">
                      Fecha desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesde}
                      min={todayISO()}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A2E4A]">
                      Fecha hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHasta}
                      min={fechaDesde}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    ["1", "Lun"],
                    ["2", "Mar"],
                    ["3", "Mié"],
                    ["4", "Jue"],
                    ["5", "Vie"],
                    ["6", "Sáb"],
                    ["0", "Dom"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setDiasSemana((prev) => ({ ...prev, [key]: !Boolean(prev[key]) }))
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm ${
                        diasSemana[key]
                          ? "bg-[#1A2E4A] text-white"
                          : "border border-[#E0E0E0] bg-white text-[#1A2E4A]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#1A2E4A]/70">
                  Tip: para 17:00 a 00:00 usá 17:00 a 23:00 con intervalo de 60 min.
                </p>
              </div>
            )}

            <div className="mt-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
              >
                {saving ? "Guardando..." : "Generar horarios"}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
            <h2 className="font-subheading text-lg font-semibold text-[#1A2E4A]">
              Horarios del día ({fecha})
            </h2>
            {selectedCampo && (
              <p className="mt-1 text-sm text-[#1A2E4A]/70">
                Campo: {selectedCampo.nombre}
              </p>
            )}

            {disponibilidades.length === 0 ? (
              <p className="mt-4 text-sm text-[#1A2E4A]/70">Sin horarios cargados.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {disponibilidades.map((d) => {
                  const reserva = agenda[d.id];
                  const links = enlaces[d.id] ?? [];
                  return (
                  <li
                    key={d.id}
                    className="flex flex-col gap-2 rounded-lg border border-[#E0E0E0] bg-[#F9F9F9] p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1A2E4A]">
                        {formatTime(d.hora_inicio)} - {formatTime(d.hora_fin)}
                      </p>
                      <p className="text-xs text-[#1A2E4A]/70">
                        ${Number(d.precio ?? 0).toLocaleString("es-AR")} / hora · Estado:{" "}
                        <b>{d.estado}</b>
                        {reserva ? (
                          <>
                            {" "}
                            · {reserva.titular_nombre || "Reserva"}{" "}
                            {reserva.cobro_externo === "sena_fuera"
                              ? "(seña cobrada por fuera)"
                              : reserva.cobro_externo === "a_cobrar_predio"
                                ? "(a cobrar en el predio)"
                                : reserva.canal === "whatsapp"
                                  ? "(pagó el enlace)"
                                  : ""}
                          </>
                        ) : null}
                        {links.length > 0 && !reserva ? (
                          <> · {links.length} enlace{links.length > 1 ? "s" : ""} de pago (el turno sigue libre)</>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.estado === "disponible" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => abrirFormPago(d.id)}
                            className="rounded-md bg-[var(--fulbito-green)] px-3 py-1.5 text-xs font-medium text-white"
                          >
                            Enlace de pago
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCargarId(d.id);
                              setFormModo("manual");
                              setCargarNombre("");
                              setCargarTel("");
                            }}
                            className="rounded-md border border-[#1A2E4A] px-3 py-1.5 text-xs font-medium text-[#1A2E4A]"
                          >
                            Reserva manual
                          </button>
                        </>
                      ) : null}
                      {links.map((e) => (
                        <a
                          key={e.token}
                          href={whatsappHref(e, d)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-[#25D366] px-3 py-1.5 text-xs font-medium text-[#128C7E] hover:bg-[#E8FFF0]"
                        >
                          WhatsApp · {e.titular_nombre}
                        </a>
                      ))}
                      {d.estado !== "bloqueado" ? (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(d.id, "bloqueado")}
                          className="rounded-md border border-[#E0E0E0] px-3 py-1.5 text-xs font-medium text-[#1A2E4A] hover:bg-[#F1F1F1]"
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(d.id, "disponible")}
                          className="rounded-md border border-[#E0E0E0] px-3 py-1.5 text-xs font-medium text-[#1A2E4A] hover:bg-[#F1F1F1]"
                        >
                          Activar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => borrarDisponibilidad(d.id)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                    </div>
                    {cargarId === d.id && formModo === "pago" ? (
                      <div className="grid gap-2">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            placeholder="Nombre"
                            value={cargarNombre}
                            onChange={(e) => setCargarNombre(e.target.value)}
                            className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
                          />
                          <input
                            placeholder="Teléfono"
                            value={cargarTel}
                            onChange={(e) => setCargarTel(e.target.value)}
                            className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
                          />
                          <input
                            placeholder="Seña"
                            type="number"
                            min={0}
                            value={cargarSena}
                            onChange={(e) => setCargarSena(e.target.value)}
                            className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
                          />
                        </div>
                        <textarea
                          value={cargarMsg}
                          onChange={(e) => setCargarMsg(e.target.value)}
                          rows={3}
                          className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void crearEnlace(d.id)}
                          className="rounded-lg bg-[#1A2E4A] px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                        >
                          {saving ? "Guardando..." : "Generar enlace (no bloquea el turno)"}
                        </button>
                      </div>
                    ) : null}
                    {cargarId === d.id && formModo === "manual" ? (
                      <div className="grid gap-2">
                        <p className="text-xs text-[#1A2E4A]/70">Nombre y teléfono son opcionales. Esto sí ocupa el horario.</p>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={cobroExterno === "sena_fuera"}
                              onChange={() => setCobroExterno("sena_fuera")}
                            />
                            Seña cobrada por fuera
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="radio"
                              checked={cobroExterno === "a_cobrar_predio"}
                              onChange={() => setCobroExterno("a_cobrar_predio")}
                            />
                            A cobrar en el predio
                          </label>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            placeholder="Nombre (opcional)"
                            value={cargarNombre}
                            onChange={(e) => setCargarNombre(e.target.value)}
                            className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
                          />
                          <input
                            placeholder="Teléfono (opcional)"
                            value={cargarTel}
                            onChange={(e) => setCargarTel(e.target.value)}
                            className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void cargarManual(d.id)}
                            className="rounded-lg bg-[#1A2E4A] px-3 py-2 text-sm font-medium text-white disabled:opacity-70"
                          >
                            {saving ? "Guardando..." : "Cargar en la agenda"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
