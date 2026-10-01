import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@shared/design";
import { fontFamily } from "../../lib/fonts";

export function PlayerPositionChip({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <View style={[styles.chip, primary && styles.primary]}>
      <Text style={[styles.txt, primary && styles.txtOn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.navyDark,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "rgba(139,201,235,0.18)",
    borderColor: "rgba(139,201,235,0.40)",
  },
  txt: {
    fontFamily: fontFamily.uiExtrabold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  txtOn: { color: colors.sky },
});
