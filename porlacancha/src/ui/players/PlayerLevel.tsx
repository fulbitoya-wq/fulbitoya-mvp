import { StyleSheet, Text } from "react-native";
import { colors } from "@shared/design";
import { fontFamily } from "../../lib/fonts";
import { PLAYER_RANKS, type PlayerRange } from "../../lib/player-ranks";

export function PlayerLevel({
  level,
  range,
  size = "md",
}: {
  level?: number;
  range: PlayerRange;
  size?: "sm" | "md" | "lg";
}) {
  if (range === "new" || level == null) return null;
  const fontSize = size === "lg" ? 56 : size === "sm" ? 22 : 28;
  const color =
    range === "silver" ? "#F7F5EF" : range === "bronze" ? "#F3D477" : PLAYER_RANKS[range].accent;
  return (
    <Text
      style={[styles.n, { fontSize, color, lineHeight: fontSize + 2 }]}
      accessibilityLabel={`Nivel ${level}`}
    >
      {level}
    </Text>
  );
}

const styles = StyleSheet.create({
  n: {
    fontFamily: fontFamily.numBold,
    textAlign: "center",
  },
});
