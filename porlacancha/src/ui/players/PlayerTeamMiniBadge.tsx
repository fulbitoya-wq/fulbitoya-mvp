import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@shared/design";
import { typeStyle } from "../textStyle";

export function PlayerTeamMiniBadge({ name }: { name: string }) {
  const letter = name.trim().slice(0, 1).toUpperCase() || "E";
  return (
    <View style={styles.wrap} accessibilityLabel={name}>
      <View style={styles.crest}>
        <Text style={styles.letter}>{letter}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 72, alignItems: "center", gap: 6 },
  crest: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: typeStyle("h3", colors.gold),
  name: { ...typeStyle("caption", colors.textSecondary), textAlign: "center", width: "100%" },
});
