"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, MapPin, Dribbble, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

const HORARIOS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

const DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function HeroSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showHorarios, setShowHorarios] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedHorario, setSelectedHorario] = useState(HORARIOS[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [zonaTexto, setZonaTexto] = useState("");
  const [zonaFocused, setZonaFocused] = useState(false);
  const [zonaLocalidadId, setZonaLocalidadId] = useState<string | null>(null);
  const [zonaPartidoId, setZonaPartidoId] = useState<string | null>(null);
  const [zonaProvinciaId, setZonaProvinciaId] = useState<string | null>(null);
  type ZonaSugerencia =
    | {
        kind: "localidad";
        id: string;
        nombre: string;
        codigo_postal: string | null;
        partido_id: string;
        provincia_id: string;
      }
    | {
        kind: "partido";
        id: string;
        nombre: string;
        provincia_id: string;
      };

  const [zonaSugerencias, setZonaSugerencias] = useState<ZonaSugerencia[]>([]);
  const [zonaLoading, setZonaLoading] = useState(false);
  const [zonaBaseLoaded, setZonaBaseLoaded] = useState(false);
  const [tipoTexto, setTipoTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [didGeoPrefill, setDidGeoPrefill] = useState(false);
  const [geoPrefillUntil, setGeoPrefillUntil] = useState<number>(0);
  const [didNearbyUrlSync, setDidNearbyUrlSync] = useState(false);

  const zonaInputRef = useRef<HTMLInputElement | null>(null);

  const toISODateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    setShowCalendar(false);
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const handleBuscar = () => {
    setError(null);

    const fecha = selectedDate ? toISODateLocal(selectedDate) : toISODateLocal(new Date());
    const hora = selectedHorario || HORARIOS[0];

    let zona = zonaTexto.trim();
    let tipo = tipoTexto.trim();

    // Robustez tipo: si el usuario escribe "Monte Grande Fútbol 7" en el campo de zona,
    // extraemos el número para `tipo` y dejamos `zona` solo con la ubicación.
    const lowerZona = zona.toLowerCase();
    const tipoMatch = lowerZona.match(/futb[oó]l\s*(5|7|9|11)/i);
    if (tipoMatch?.[1]) {
      if (!tipo) tipo = tipoMatch[1];
      zona = zona.replace(tipoMatch[0], "").trim();
    }

    const params = new URLSearchParams();
    if (zonaLocalidadId) params.set("localidadId", zonaLocalidadId);
    if (zonaPartidoId) params.set("partidoId", zonaPartidoId);
    if (zonaProvinciaId) params.set("provinciaId", zonaProvinciaId);
    // Solo buscamos por texto si no hubo selección geográfica.
    if (!zonaLocalidadId && !zonaPartidoId && !zonaProvinciaId && zona) params.set("zona", zona);
    if (tipo) params.set("tipo", tipo);
    params.set("fecha", fecha);
    params.set("hora", hora);

    setShowCalendar(false);
    setShowHorarios(false);

    router.push(`/?${params.toString()}`);
  };

  useEffect(() => {
    // Si acabamos de hacer un prefill por geolocalización, evitamos que el autocomplete
    // vuelva a consultar por texto y reemplace las sugerencias.
    if (Date.now() < geoPrefillUntil) return;

    const query = zonaTexto.trim();
    const loadDefault = async () => {
      setZonaLoading(true);
      try {
        const [localidadesRes, partidosRes] = await Promise.all([
          supabase
            .from("localidades")
            .select("id, nombre, codigo_postal, partido_id, partidos ( provincia_id )")
            .order("nombre", { ascending: true })
            .limit(4),
          supabase
            .from("partidos")
            .select("id, nombre, provincia_id")
            .order("nombre", { ascending: true })
            .limit(4),
        ]);

        if (localidadesRes.error || partidosRes.error) return;

        const locs: any[] = (localidadesRes.data ?? []) as any[];
        const parts: any[] = (partidosRes.data ?? []) as any[];

        const combined: ZonaSugerencia[] = [
          ...locs
            .map((l) => {
              const partidosAny: any = l.partidos;
              const provincia_id =
                (Array.isArray(partidosAny) ? partidosAny[0]?.provincia_id : partidosAny?.provincia_id) ?? null;
              if (!provincia_id) return null;
              return {
                kind: "localidad",
                id: l.id as string,
                nombre: l.nombre as string,
                codigo_postal: (l.codigo_postal ?? null) as string | null,
                partido_id: l.partido_id as string,
                provincia_id: provincia_id as string,
              } satisfies ZonaSugerencia;
            })
            .filter(Boolean) as ZonaSugerencia[],
          ...parts.map((p) => {
            return {
              kind: "partido",
              id: p.id as string,
              nombre: p.nombre as string,
              provincia_id: p.provincia_id as string,
            } satisfies ZonaSugerencia;
          }),
        ];

        setZonaSugerencias(combined.slice(0, 8));
        setZonaBaseLoaded(true);
      } finally {
        setZonaLoading(false);
      }
    };

    // Si está vacío, mostramos sugerencias base (solo una vez).
    if (!query) {
      if (!zonaBaseLoaded) loadDefault();
      return;
    }

    // Si el usuario escribió 1-2 caracteres, no mostramos nada para evitar ruido.
    if (query.length < 3) {
      setZonaSugerencias([]);
      setZonaLoading(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setZonaLoading(true);
        const [localidadesRes, partidosRes] = await Promise.all([
          supabase
            .from("localidades")
            .select("id, nombre, codigo_postal, partido_id, partidos ( provincia_id )")
            .ilike("nombre", `%${query}%`)
            .order("nombre", { ascending: true })
            .limit(6),
          supabase
            .from("partidos")
            .select("id, nombre, provincia_id")
            .ilike("nombre", `%${query}%`)
            .order("nombre", { ascending: true })
            .limit(6),
        ]);

        if (cancelled) return;

        if (localidadesRes.error || partidosRes.error) {
          setZonaSugerencias([]);
          return;
        }

        const locs: any[] = (localidadesRes.data ?? []) as any[];
        const parts: any[] = (partidosRes.data ?? []) as any[];

        const combined: ZonaSugerencia[] = [
          ...locs
            .map((l) => {
              const partidosAny: any = l.partidos;
              const provincia_id =
                (Array.isArray(partidosAny) ? partidosAny[0]?.provincia_id : partidosAny?.provincia_id) ?? null;
              if (!provincia_id) return null;
              return {
                kind: "localidad",
                id: l.id as string,
                nombre: l.nombre as string,
                codigo_postal: (l.codigo_postal ?? null) as string | null,
                partido_id: l.partido_id as string,
                provincia_id: provincia_id as string,
              } satisfies ZonaSugerencia;
            })
            .filter(Boolean) as ZonaSugerencia[],
          ...parts.map((p) => {
            return {
              kind: "partido",
              id: p.id as string,
              nombre: p.nombre as string,
              provincia_id: p.provincia_id as string,
            } satisfies ZonaSugerencia;
          }),
        ];

        setZonaSugerencias(combined.slice(0, 10));
      } finally {
        if (!cancelled) setZonaLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [zonaTexto]);

  useEffect(() => {
    const prefill = async () => {
      if (didGeoPrefill) return;
      if (typeof window === "undefined") return;
      if (!navigator.geolocation) return;

      const qpNearby = searchParams.get("nearby");
      const qpLocalidadId = searchParams.get("localidadId");
      const qpPartidoId = searchParams.get("partidoId");
      const qpProvinciaId = searchParams.get("provinciaId");
      const qpTipo = searchParams.get("tipo");
      const qpHora = searchParams.get("hora");

      // Si la URL ya vino precargada por geolocalización (nearby=1),
      // evitamos volver a pedir permisos.
      if (qpNearby === "1" && qpLocalidadId) {
        setDidGeoPrefill(true);
        setDidNearbyUrlSync(true);
        setZonaLocalidadId(qpLocalidadId);
        setZonaPartidoId(qpPartidoId);
        setZonaProvinciaId(qpProvinciaId);

        const { data: locData } = await supabase
          .from("localidades")
          .select("nombre")
          .eq("id", qpLocalidadId)
          .single();

        if (locData?.nombre) setZonaTexto(locData.nombre);
        return;
      }

      // Si la URL trae una búsqueda avanzada por IDs geo (localidad/partido/provincia),
      // no sobreescribimos la URL pidiendo geolocalización.
      // Esto evita que se pierdan params como `tipo`/`hora` y se rompa el filtrado.
      if (qpLocalidadId) {
        setDidGeoPrefill(true);
        setZonaLocalidadId(qpLocalidadId);
        setZonaPartidoId(qpPartidoId);
        setZonaProvinciaId(qpProvinciaId);
        const { data: locData } = await supabase
          .from("localidades")
          .select("nombre")
          .eq("id", qpLocalidadId)
          .single();
        if (locData?.nombre) setZonaTexto(locData.nombre);
        return;
      }

      setDidGeoPrefill(true);

      const getPosition = () =>
        new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 60_000 });
        });

      try {
        const pos = await getPosition();
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Radio inicial aproximado: 60 km (para que sea razonable y no traiga demasiadas filas).
        const radiusKm = 60;
        const deltaLat = radiusKm / 111;
        const deltaLng = radiusKm / (111 * Math.cos((userLat * Math.PI) / 180));

        const minLat = userLat - deltaLat;
        const maxLat = userLat + deltaLat;
        const minLng = userLng - deltaLng;
        const maxLng = userLng + deltaLng;

        const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371;
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const { data: localidadesRes, error: locErr } = await supabase
          .from("localidades")
          .select("id,nombre,codigo_postal,lat,lng,partido_id,partidos ( provincia_id )")
          .gte("lat", minLat)
          .lte("lat", maxLat)
          .gte("lng", minLng)
          .lte("lng", maxLng)
          .limit(200);

        if (locErr || !localidadesRes?.length) return;

        const withDist = (localidadesRes ?? [])
          .filter((l: any) => l.lat !== null && l.lng !== null && l.partidos?.provincia_id)
          .map((l: any) => {
            const distKm = haversineKm(userLat, userLng, Number(l.lat), Number(l.lng));
            return { ...l, distKm };
          })
          .sort((a: any, b: any) => a.distKm - b.distKm);

        const top = withDist.slice(0, 6);
        if (!top.length) return;

        const provinciaIds = Array.from(
          new Set(top.map((t: any) => t.partidos.provincia_id as string).filter(Boolean))
        ) as string[];

        const { data: provinciasRes } = provinciaIds.length
          ? await supabase.from("provincias").select("id,nombre").in("id", provinciaIds)
          : { data: [] as any[] };

        const provinciasById = new Map<string, string>(
          (provinciasRes ?? []).map((p: any) => [p.id as string, p.nombre as string])
        );

        const suggestions: ZonaSugerencia[] = top.map((t: any) => {
          const provinciaNombre = provinciasById.get(t.partidos.provincia_id as string) ?? "Buenos Aires";
          return {
            kind: "localidad",
            id: t.id as string,
            nombre: `${provinciaNombre} ${t.nombre as string}`,
            codigo_postal: (t.codigo_postal ?? null) as string | null,
            partido_id: t.partido_id as string,
            provincia_id: t.partidos.provincia_id as string,
          } satisfies ZonaSugerencia;
        });

        // Bloqueamos el autocomplete por texto por unos segundos.
        setGeoPrefillUntil(Date.now() + 4500);
        setZonaBaseLoaded(true);

        setZonaSugerencias(suggestions);
        const first = suggestions[0];
        setZonaLocalidadId(first.id);
        setZonaPartidoId((first as any).partido_id);
        setZonaProvinciaId((first as any).provincia_id);

        setZonaTexto(first.nombre);

        // Para que se vea el dropdown de opciones cerca de tu ubicación.
        setTimeout(() => zonaInputRef.current?.focus(), 0);

        // Sincronizamos la URL para que la home renderice "cerca tuyo"
        // sin depender de apretar "Buscar".
        if (!didNearbyUrlSync) {
          const fecha = toISODateLocal(new Date());
          const params = new URLSearchParams();
          params.set("nearby", "1");
          params.set("fecha", fecha);
          params.set("localidadId", first.id);
          params.set("partidoId", (first as any).partido_id);
          params.set("provinciaId", (first as any).provincia_id);
          router.replace(`/?${params.toString()}`);
          setDidNearbyUrlSync(true);
        }
      } catch {
        // Si niegan permisos o falla, seguimos con autocomplete normal.
      }
    };

    prefill();
  }, [didGeoPrefill]);

  return (
    <section className="relative min-h-[500px] pt-24 md:min-h-[600px]">
      {/* Fondo con imagen */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bg.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[var(--fulbito-navy)]/85" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
        <h1 className="font-heading text-4xl tracking-wide text-white sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="text-balance">¡ENCONTRÁ TU CANCHA Y JUGÁ YA!</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg md:mt-6 md:text-xl">
          La forma más fácil de reservar canchas de fútbol en Buenos Aires. ¡Buscá, reservá y jugá!
        </p>

        <div className="mt-8 w-full max-w-4xl md:mt-12">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/90 p-4 shadow-xl backdrop-blur-md md:flex-row md:items-center md:gap-0 md:rounded-full md:p-2">
            <div className="group flex flex-1 items-center gap-3 px-4 py-2 md:border-r md:border-gray-200">
              <button
                type="button"
                onClick={() => setDidGeoPrefill(false)}
                aria-label="Usar mi ubicación"
                className="inline-flex items-center justify-center"
              >
                <MapPin className="h-5 w-5 shrink-0 text-gray-400 group-focus-within:text-[var(--fulbito-green)]" />
              </button>
              <div className="relative w-full">
                <input
                  ref={zonaInputRef}
                  type="text"
                  placeholder="Barrio o zona (ej. Palermo)"
                  value={zonaTexto}
                  onFocus={() => setZonaFocused(true)}
                  onBlur={() => setZonaFocused(false)}
                  onChange={(e) => {
                    setZonaTexto(e.target.value);
                    setZonaLocalidadId(null);
                    setZonaPartidoId(null);
                    setZonaProvinciaId(null);
                  }}
                  className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
                {zonaLoading && zonaTexto.trim().length >= 3 && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-xl">
                    Buscando...
                  </div>
                )}
                {!zonaLoading &&
                  zonaSugerencias.length > 0 &&
                  zonaFocused && (
                    <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[28rem] max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                    {zonaSugerencias.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => {
                          // Importante: evita que el input pierda foco antes de aplicar la selección.
                          e.preventDefault();
                          setZonaTexto(s.nombre);
                          if (s.kind === "localidad") {
                            setZonaLocalidadId(s.id);
                            setZonaPartidoId(s.partido_id);
                            setZonaProvinciaId(s.provincia_id);
                          } else {
                            setZonaLocalidadId(null);
                            setZonaPartidoId(s.id);
                            setZonaProvinciaId(s.provincia_id);
                          }
                          setZonaSugerencias([]);
                        }}
                        className="block w-full whitespace-normal px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                      >
                        <span className="block font-medium break-words">{s.nombre}</span>
                        {"codigo_postal" in s && s.codigo_postal ? (
                          <span className="block text-xs text-gray-500">({s.codigo_postal})</span>
                        ) : null}
                        <span className="block text-xs text-gray-500">{s.kind === "partido" ? "Partido" : "Localidad"}</span>
                      </button>
                    ))}
                    </div>
                  )}
              </div>
            </div>
            <div className="group flex flex-1 items-center gap-3 px-4 py-2 md:border-r md:border-gray-200">
              <Dribbble className="h-5 w-5 shrink-0 text-gray-400 group-focus-within:text-[var(--fulbito-green)]" />
              <select
                value={tipoTexto}
                onChange={(e) => setTipoTexto(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
              >
                <option value="">Tipo (5, 7, 11)</option>
                <option value="5">Fútbol 5</option>
                <option value="7">Fútbol 7</option>
                <option value="11">Fútbol 11</option>
              </select>
            </div>
            <div className="relative flex flex-1 items-center gap-3 px-4 py-2 md:border-r md:border-gray-200">
              <Calendar className={`h-5 w-5 shrink-0 transition-colors ${showCalendar ? "text-[var(--fulbito-green)]" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Fecha (dd/mm/aaaa)"
                value={selectedDate ? formatDate(selectedDate) : ""}
                readOnly
                onClick={() => { setShowCalendar(!showCalendar); setShowHorarios(false); }}
                className="w-full cursor-pointer bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
              {showCalendar && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <button type="button" onClick={prevMonth} className="rounded-full p-1 hover:bg-gray-100">
                      <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <span className="font-semibold text-gray-800">
                      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button type="button" onClick={nextMonth} className="rounded-full p-1 hover:bg-gray-100">
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {DAYS.map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentMonth).map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => day && handleDateSelect(day)}
                        disabled={!day}
                        className={`h-9 w-9 rounded-full text-sm transition-colors ${
                          day === null ? "cursor-default" :
                          selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear()
                            ? "bg-[var(--fulbito-green)] font-semibold text-white"
                            : "text-gray-700 hover:bg-[var(--fulbito-green)]/10"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative flex flex-1 items-center gap-3 px-4 py-2">
              <Clock className={`h-5 w-5 shrink-0 transition-colors ${showHorarios ? "text-[var(--fulbito-green)]" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder="Horario"
                value={selectedHorario}
                readOnly
                onClick={() => { setShowHorarios(!showHorarios); setShowCalendar(false); }}
                className="w-full cursor-pointer bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
              {showHorarios && (
                <div className="absolute left-0 top-full z-50 mt-2 max-h-60 w-full min-w-32 overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
                  {HORARIOS.map((horario) => (
                    <button
                      key={horario}
                      type="button"
                      onClick={() => { setSelectedHorario(horario); setShowHorarios(false); }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        selectedHorario === horario ? "bg-[var(--fulbito-green)]/10 font-semibold text-[var(--fulbito-green)]" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {horario}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleBuscar}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--fulbito-green)] px-6 py-6 font-semibold text-white transition hover:bg-[var(--fulbito-green-hover)] md:rounded-full"
            >
              <Search className="h-5 w-5" />
              Buscar cancha
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </section>
  );
}
