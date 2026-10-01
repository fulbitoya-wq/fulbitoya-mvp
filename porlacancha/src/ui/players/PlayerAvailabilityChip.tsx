import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@shared/design";
import { fontFamily } from "../../lib/fonts";

export function PlayerAvailabilityChip() {
  return (
    <View style={styles.chip}>
      <View style={styles.dot} />
      <Text style={styles.txt}>Disponible</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34, 197, 94, 0.16)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  txt: {
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.3,
  },
});
