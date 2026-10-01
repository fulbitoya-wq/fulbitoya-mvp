import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@shared/design";
import { fontFamily } from "../../lib/fonts";

export function PlayerFormatChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.txt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 24,
    minWidth: 36,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139,201,235,0.30)",
    backgroundColor: colors.navyDark,
    alignItems: "center",
    justifyContent: "center",
  },
  txt: {
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 0.4,
  },
});
