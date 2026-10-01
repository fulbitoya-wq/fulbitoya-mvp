import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { Shield, iconStroke } from "../../lib/icons";
import { typeStyle } from "../textStyle";

export function PlayerAchievementBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <View style={styles.icon}>
        <Shield color={colors.gold} size={16} strokeWidth={iconStroke} />
      </View>
      <Text style={styles.txt} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: "48%",
    flexGrow: 1,
    minHeight: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[12],
    gap: space[8],
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(217,169,40,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  txt: typeStyle("caption", colors.white),
});
