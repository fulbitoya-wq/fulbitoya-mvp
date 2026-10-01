import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@shared/design";
import { fontFamily } from "../../lib/fonts";
import { PLAYER_RANKS, type PlayerRange } from "../../lib/player-ranks";

export function PlayerRankBadge({ range, compact = true }: { range: PlayerRange; compact?: boolean }) {
  const meta = PLAYER_RANKS[range];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: range === "new" ? "rgba(139,201,235,0.18)" : "rgba(0,27,68,0.55)" },
        compact && styles.compact,
      ]}
    >
      <Text style={[styles.txt, { color: meta.accent }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  compact: { paddingHorizontal: 6 },
  txt: {
    fontFamily: fontFamily.uiExtrabold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.white,
  },
});
