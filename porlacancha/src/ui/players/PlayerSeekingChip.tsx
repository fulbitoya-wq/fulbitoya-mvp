import { StyleSheet, Text, View } from "react-native";
import { colors, radius, statusSurfaces } from "@shared/design";
import { fontFamily } from "../../lib/fonts";

export function PlayerSeekingChip() {
  return (
    <View style={styles.chip} accessibilityLabel="Disponible">
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
    backgroundColor: statusSurfaces.open,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  txt: {
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
    color: colors.success,
    letterSpacing: 0.3,
  },
});
