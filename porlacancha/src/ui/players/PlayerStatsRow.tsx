import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { fontFamily } from "../../lib/fonts";
import { typeStyle } from "../textStyle";

type Stat = { value: string; label: string };

export function PlayerStatsRow({ items }: { items: Stat[] }) {
  return (
    <View style={styles.row}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.col, i < items.length - 1 && styles.sep]}>
          <Text style={styles.n}>{it.value}</Text>
          <Text style={styles.l}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: space[16],
  },
  col: { flex: 1, alignItems: "center", gap: 4 },
  sep: { borderRightWidth: 1, borderRightColor: colors.border },
  n: {
    fontFamily: fontFamily.numBold,
    fontSize: 28,
    lineHeight: 30,
    color: colors.white,
  },
  l: typeStyle("caption", colors.textSecondary),
});
