import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@shared/design";
import { Calendar, Trophy, iconStroke } from "../lib/icons";
import { Mute, NotifBell } from "../ui";
import { typeStyle } from "../ui/textStyle";
import { BrandLogo } from "../ui";

type Props = {
  unreadNotifs?: number;
  onOpenNotifs?: () => void;
  onReservar: () => void;
  onPartidos: () => void;
};

export function HomeCaminosScreen({ unreadNotifs = 0, onOpenNotifs, onReservar, onPartidos }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { paddingTop: Math.max(insets.top, space[12]) }]}>
      <View style={styles.top}>
        <BrandLogo size="sm" />
        {onOpenNotifs ? <NotifBell unread={unreadNotifs} onPress={onOpenNotifs} /> : null}
      </View>
      <Text style={styles.h}>¿Qué querés hacer?</Text>
      <Mute>Reservá un turno o buscá un partido abierto.</Mute>
      <Pressable onPress={onReservar} style={styles.card} accessibilityRole="button">
        <Calendar color={colors.gold} size={28} strokeWidth={iconStroke} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardH}>Reservar cancha</Text>
          <Text style={styles.cardP}>Elegí predio, día y turno. Pagás seña o total.</Text>
        </View>
      </Pressable>
      <Pressable onPress={onPartidos} style={styles.card} accessibilityRole="button">
        <Trophy color={colors.gold} size={28} strokeWidth={iconStroke} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardH}>Partidos abiertos</Text>
          <Text style={styles.cardP}>Sumate a un desafío o publicá el tuyo.</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: space[16], gap: space[12] },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h: typeStyle("h2", colors.white),
  card: {
    minHeight: 88,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space[16],
    flexDirection: "row",
    alignItems: "center",
    gap: space[12],
  },
  cardH: typeStyle("h3", colors.white),
  cardP: typeStyle("bodySmall", colors.textSecondary),
});
