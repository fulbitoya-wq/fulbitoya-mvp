import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@shared/design";
import { useAuth } from "../auth/AuthProvider";
import { formatFechaCorta, formatHora, etiquetaTipo } from "../lib/desafios";
import type { TurnoPublico } from "../lib/plc";
import {
  cotizarReserva,
  listarPrediosPublicos,
  listarTurnosDePredio,
  pagarReserva,
  pesosReserva,
  type CotizacionReserva,
  type PredioPublico,
} from "../lib/reserva";
import { ChevronLeft, iconStroke } from "../lib/icons";
import { Button, EmptyState, IconBtn, Mute, showNotice } from "../ui";
import { PagoQrCard } from "../ui/PagoQrCard";
import { typeStyle } from "../ui/textStyle";

type Props = {
  onBack: () => void;
  onRequestAuth: () => void;
  onDone: () => void;
  initialCanchaId?: string | null;
  initialTurnoId?: string | null;
};

export function ReservarCanchaScreen({
  onBack,
  onRequestAuth,
  onDone,
  initialCanchaId = null,
  initialTurnoId = null,
}: Props) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [predios, setPredios] = useState<PredioPublico[]>([]);
  const [canchaId, setCanchaId] = useState<string | null>(initialCanchaId);
  const [turnos, setTurnos] = useState<TurnoPublico[]>([]);
  const [turnoId, setTurnoId] = useState<string | null>(initialTurnoId);
  const [tipo, setTipo] = useState<"sena" | "total">("sena");
  const [cot, setCot] = useState<CotizacionReserva | null>(null);
  const [acepto, setAcepto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [qr, setQr] = useState<{ initPoint: string; holdId: string } | null>(null);

  useEffect(() => {
    void listarPrediosPublicos().then(({ data, error }) => {
      setPredios(data);
      setLoadErr(error);
    });
  }, []);

  useEffect(() => {
    if (!canchaId) {
      setTurnos([]);
      setTurnoId(null);
      return;
    }
    void listarTurnosDePredio(canchaId).then(setTurnos);
  }, [canchaId]);

  useEffect(() => {
    if (!turnoId) {
      setCot(null);
      setAcepto(false);
      return;
    }
    void cotizarReserva(turnoId, tipo).then((res) => {
      if (!res.ok) {
        setCot(null);
        showNotice("No se pudo cotizar", res.error);
        return;
      }
      setCot(res.cot);
    });
  }, [turnoId, tipo]);

  const fechas = useMemo(() => [...new Set(turnos.map((t) => t.fecha))], [turnos]);
  const [fecha, setFecha] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTurnoId) return;
    const t = turnos.find((x) => x.id === initialTurnoId);
    if (t) {
      setCanchaId(t.cancha_id);
      setFecha(t.fecha);
      setTurnoId(t.id);
    }
  }, [turnos, initialTurnoId]);
  const turnosDia = turnos.filter((t) => !fecha || t.fecha === fecha);

  const pagar = async () => {
    if (!turnoId || !acepto) return;
    if (!session?.access_token) {
      onRequestAuth();
      return;
    }
    setBusy(true);
    const res = await pagarReserva(turnoId, tipo, session.access_token);
    setBusy(false);
    if (!res.ok) {
      showNotice("No se pudo reservar", res.error);
      return;
    }
    if ("reservaId" in res) {
      showNotice("Reserva", "El turno quedó reservado.");
      onDone();
      return;
    }
    if (res.canal === "qr") {
      setQr({ initPoint: res.initPoint, holdId: res.holdId });
      return;
    }
    showNotice("Mercado Pago", "Te llevamos a pagar. El turno se confirma cuando se aprueba el pago.");
    onDone();
  };

  return (
    <View style={styles.fill}>
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, space[8]) }]}>
        <IconBtn onPress={onBack} label="Volver">
          <ChevronLeft color={colors.gold} size={22} strokeWidth={iconStroke} />
        </IconBtn>
        <Text style={styles.title}>Reservar cancha</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space[16], paddingBottom: insets.bottom + 40 }}>
        <Text style={styles.h}>Predio</Text>
        {loadErr ? <Mute>{loadErr}</Mute> : null}
        {predios.length === 0 ? <EmptyState title="No hay turnos" body="Todavía no hay predios con horarios libres." /> : null}
        {predios.map((p) => (
          <Pressable key={p.id} onPress={() => setCanchaId(p.id)} style={[styles.card, canchaId === p.id && styles.cardOn]}>
            <Text style={styles.body}>{p.nombre}</Text>
            <Mute>{p.barrio || p.direccion || ""}</Mute>
          </Pressable>
        ))}

        {canchaId ? (
          <>
            <Text style={[styles.h, { marginTop: space[16] }]}>Día</Text>
            <View style={styles.wrap}>
              {fechas.slice(0, 14).map((f) => (
                <Pressable key={f} onPress={() => setFecha(f)} style={[styles.chip, fecha === f && styles.chipOn]}>
                  <Text style={styles.chipT}>{formatFechaCorta(f)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.h, { marginTop: space[16] }]}>Turno</Text>
            {turnosDia.map((t) => (
              <Pressable key={t.id} onPress={() => setTurnoId(t.id)} style={[styles.card, turnoId === t.id && styles.cardOn]}>
                <Text style={styles.body}>
                  {t.campo_nombre} · {etiquetaTipo(t.campo_tipo)} · {formatHora(t.hora_inicio)}
                </Text>
                <Mute>{t.precio != null ? pesosReserva(t.precio) : formatFechaCorta(t.fecha)}</Mute>
              </Pressable>
            ))}
          </>
        ) : null}

        {turnoId ? (
          <>
            <Text style={[styles.h, { marginTop: space[16] }]}>Cómo pagás</Text>
            <View style={styles.wrap}>
              <Pressable onPress={() => setTipo("sena")} style={[styles.chip, tipo === "sena" && styles.chipOn]}>
                <Text style={styles.chipT}>Seña</Text>
              </Pressable>
              <Pressable onPress={() => setTipo("total")} style={[styles.chip, tipo === "total" && styles.chipOn]}>
                <Text style={styles.chipT}>Total adelantado</Text>
              </Pressable>
            </View>
            {cot ? (
              <View style={{ marginTop: space[12], gap: space[6] }}>
                <Mute>Cancha {pesosReserva(cot.precio_cancha)} · seña {pesosReserva(cot.sena)}</Mute>
                {tipo === "total" && cot.descuento > 0 ? (
                  <Mute>Descuento por pagar el total: {pesosReserva(cot.descuento)}</Mute>
                ) : null}
                <Text style={styles.pay}>A pagar {pesosReserva(cot.monto_pagar)}</Text>
                <View style={styles.rules}>
                  <Text style={styles.rulesT}>{cot.texto_reglas}</Text>
                </View>
                <Pressable onPress={() => setAcepto((v) => !v)} style={styles.row}>
                  <View style={[styles.box, acepto && styles.boxOn]} />
                  <Text style={styles.body}>Acepto las reglas de cancelación y de seña.</Text>
                </Pressable>
                {qr && session?.access_token ? (
                  <PagoQrCard
                    initPoint={qr.initPoint}
                    holdId={qr.holdId}
                    accessToken={session.access_token}
                    onConfirmada={() => {
                      showNotice("Reserva", "El pago se confirmó. El turno quedó reservado.");
                      onDone();
                    }}
                    onVencida={() => {
                      setQr(null);
                      showNotice("Pago", "Se venció el tiempo para pagar. El turno volvió a quedar libre.");
                    }}
                  />
                ) : (
                <Button
                  label={busy ? "Reservando..." : "Pagar y reservar"}
                  onPress={() => void pagar()}
                  disabled={!acepto || busy}
                  loading={busy}
                />
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.navy },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space[8] },
  title: { ...typeStyle("h3", colors.white), flex: 1, textAlign: "center" },
  h: typeStyle("h3", colors.white),
  body: typeStyle("body", colors.white),
  pay: typeStyle("numM", colors.gold),
  card: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space[12],
    backgroundColor: colors.surface,
    marginTop: space[8],
  },
  cardOn: { borderColor: colors.gold },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[8], marginTop: space[8] },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space[12],
    paddingVertical: space[8],
  },
  chipOn: { borderColor: colors.gold },
  chipT: typeStyle("bodySmall", colors.white),
  rules: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space[12],
    backgroundColor: colors.surface,
  },
  rulesT: typeStyle("bodySmall", colors.textSecondary),
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space[12] },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.gold },
  boxOn: { backgroundColor: colors.gold },
});
