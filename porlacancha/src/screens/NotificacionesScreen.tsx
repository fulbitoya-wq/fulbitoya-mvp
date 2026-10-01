import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@shared/design";
import { ChevronLeft, iconStroke } from "../lib/icons";
import {
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  type DestinoNotif,
  type Notificacion,
} from "../lib/notificaciones";
import { Button, Card, EmptyState, IconBtn, Mute } from "../ui";
import { typeStyle } from "../ui/textStyle";

type Props = {
  items: Notificacion[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpen: (destino: DestinoNotif, equipoId: string | null, desafioId?: string | null) => void;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function NotificacionesScreen({ items, loading, onBack, onRefresh, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const unread = items.some((n) => !n.leida);

  const tap = useCallback(
    async (n: Notificacion) => {
      if (!n.leida) await marcarNotificacionLeida(n.id);
      onOpen(n.destino, n.equipoId, n.desafioId);
    },
    [onOpen]
  );

  const markAll = async () => {
    setBusy(true);
    await marcarTodasNotificacionesLeidas();
    onRefresh();
    setBusy(false);
  };

  return (
    <View style={styles.fill}>
      <View style={[styles.bar, { paddingTop: Math.max(insets.top, space[8]) }]}>
        <IconBtn onPress={onBack} label="Volver">
          <ChevronLeft color={colors.gold} size={22} strokeWidth={iconStroke} />
        </IconBtn>
        <Text style={styles.title}>Avisos</Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: space[16], paddingBottom: insets.bottom + space[32] }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {unread ? (
          <View style={{ marginBottom: space[12] }}>
            <Button label={busy ? "Marcando..." : "Marcar todas como leídas"} onPress={() => void markAll()} />
          </View>
        ) : null}
        {items.length === 0 && !loading ? (
          <EmptyState title="No tenés avisos" body="Cuando te inviten a un equipo, pidan entrar o te pasen la capitanía, aparece acá. Sin notificaciones push todavía." />
        ) : (
          items.map((n) => (
            <Card
              key={n.id}
              style={[styles.card, !n.leida && styles.unread]}
              onPress={() => void tap(n)}
            >
              <Text style={styles.titulo}>{n.titulo}</Text>
              <Text style={styles.cuerpo}>{n.cuerpo}</Text>
              <Mute>{formatWhen(n.createdAt)}</Mute>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.navy },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space[8] },
  title: { ...typeStyle("h3", colors.white), flex: 1, textAlign: "center" },
  card: { marginBottom: space[10] },
  unread: { borderColor: colors.gold, borderWidth: 1, borderRadius: radius.lg },
  titulo: typeStyle("h3", colors.white),
  cuerpo: { ...typeStyle("bodySmall", colors.textSecondary), marginTop: 4, marginBottom: 6 },
});
