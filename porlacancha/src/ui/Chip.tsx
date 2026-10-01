import { colors, statusSurfaces } from "@shared/design";
import { StyleSheet, Text, View } from "react-native";
import { typeStyle } from "./textStyle";

export type ChipTone =
  | "open"
  | "urgent"
  | "complete"
  | "pending"
  | "won"
  | "lost"
  | "cancelled"
  | "payment"
  | "gold";

const toneBg: Record<ChipTone, string> = {
  open: statusSurfaces.open,
  urgent: statusSurfaces.urgent,
  complete: statusSurfaces.complete,
  pending: statusSurfaces.pending,
  won: statusSurfaces.won,
  lost: statusSurfaces.lost,
  cancelled: statusSurfaces.cancelled,
  payment: statusSurfaces.payment,
  gold: "rgba(217,169,40,0.18)",
};

const toneFg: Record<ChipTone, string> = {
  open: colors.white,
  urgent: colors.gold,
  complete: colors.sky,
  pending: colors.textSecondary,
  won: colors.goldLight,
  lost: colors.textSecondary,
  cancelled: colors.danger,
  payment: colors.warning,
  gold: colors.gold,
};

export function Chip({ label, tone = "gold" }: { label: string; tone?: ChipTone }) {
  return (
    <View style={[styles.chip, { backgroundColor: toneBg[tone] }]}>
      {tone === "open" ? <View style={styles.dot} /> : null}
      <Text style={[styles.txt, { color: toneFg[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  txt: {
    ...typeStyle("caption", colors.gold),
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
