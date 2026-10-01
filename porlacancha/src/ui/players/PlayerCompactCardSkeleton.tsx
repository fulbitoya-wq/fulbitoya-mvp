import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, radius, space } from "@shared/design";
import { SHIELD_OUTER, SHIELD_VB } from "../../lib/player-shield";

export function PlayerCompactCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Cargando jugador">
      <View style={styles.shield}>
        <Svg width={SHIELD_VB.w} height={SHIELD_VB.h} viewBox={`0 0 ${SHIELD_VB.w} ${SHIELD_VB.h}`}>
          <Path d={SHIELD_OUTER} fill={colors.surfaceElevated} />
        </Svg>
      </View>
      <View style={styles.mid}>
        <View style={[styles.line, { width: "70%" }]} />
        <View style={[styles.line, { width: "42%", height: 10 }]} />
        <View style={styles.chips}>
          <View style={styles.chip} />
          <View style={styles.chip} />
        </View>
        <View style={[styles.line, { width: "55%", height: 10 }]} />
        <View style={styles.chips}>
          <View style={styles.fmt} />
          <View style={styles.fmt} />
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.chip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 122,
    flexDirection: "row",
    gap: space[12],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[12],
  },
  shield: {
    width: SHIELD_VB.w,
    height: SHIELD_VB.h,
  },
  mid: { flex: 1, gap: 8, paddingTop: 4 },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  chips: { flexDirection: "row", gap: 6 },
  chip: { width: 36, height: 22, borderRadius: 8, backgroundColor: colors.navyDark },
  fmt: { width: 32, height: 22, borderRadius: 12, backgroundColor: colors.navyDark },
  right: { width: 80, alignItems: "flex-end", gap: 8 },
});
