import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, featureFlags, radius, space } from "@shared/design";
import { fontFamily } from "../../lib/fonts";
import { formatArs, type PlayerRange } from "../../lib/player-ranks";
import type { ModoJuego } from "../../lib/perfil";
import { Heart, MapPin, iconStroke } from "../../lib/icons";
import { typeStyle } from "../textStyle";
import { PlayerAvailabilityChip } from "./PlayerAvailabilityChip";
import { PlayerSeekingChip } from "./PlayerSeekingChip";
import { PlayerRankShield } from "./PlayerRankShield";
import { PlayerFormatChip } from "./PlayerFormatChip";
import { PlayerPositionChip } from "./PlayerPositionChip";

export type PlayerCompactCardProps = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  level?: number | null;
  range: PlayerRange;
  primaryPosition: string;
  secondaryPositions?: string[];
  zone: string;
  formats: string[];
  buscaEquipo?: boolean;
  modoJuego?: ModoJuego;
  availableForHire?: boolean;
  pricePerMatch?: number | null;
  favorite?: boolean;
  showFavorite?: boolean;
  onPress?: () => void;
  onFavoritePress?: () => void;
};

export function PlayerCompactCard({
  name,
  username,
  avatarUrl,
  level,
  range,
  primaryPosition,
  secondaryPositions = [],
  zone,
  formats,
  buscaEquipo,
  modoJuego,
  availableForHire,
  pricePerMatch,
  favorite,
  showFavorite = true,
  onPress,
  onFavoritePress,
}: PlayerCompactCardProps) {
  const showHire = featureFlags.contratacion_habilitada && Boolean(availableForHire);
  const showRate = modoJuego === "cobro_por_partido" && pricePerMatch != null;
  const showFree = modoJuego === "sin_cobrar";
  const positions = [primaryPosition, ...secondaryPositions].filter(Boolean);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${range === "new" ? "nuevo en PorLaCancha" : `rango ${range}, nivel ${level}`}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <PlayerRankShield name={name} avatarUrl={avatarUrl} level={level ?? undefined} range={range} />
        <View style={styles.mid}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {username ? (
            <Text style={styles.user} numberOfLines={1}>
              @{username}
            </Text>
          ) : null}
          {positions.length > 0 ? (
            <View style={styles.posRow}>
              {positions.slice(0, 3).map((p, i) => (
                <PlayerPositionChip key={`${p}-${i}`} label={p} primary={i === 0} />
              ))}
            </View>
          ) : null}
          <View style={styles.zone}>
            <MapPin color={colors.sky} size={12} strokeWidth={iconStroke} />
            <Text style={styles.zoneTxt} numberOfLines={1}>
              {zone}
            </Text>
          </View>
          <View style={styles.fmt}>
            {formats.map((f) => (
              <PlayerFormatChip key={f} label={f} />
            ))}
          </View>
        </View>
        <View style={styles.right}>
          {showFavorite ? <View style={{ height: 40 }} /> : null}
          {buscaEquipo ? <PlayerSeekingChip /> : null}
          {showHire ? <PlayerAvailabilityChip /> : null}
          {showFree ? (
            <View style={styles.rate}>
              <Text style={styles.rateL}>Juega</Text>
              <Text style={styles.rateN}>Gratis</Text>
            </View>
          ) : null}
          {showRate ? (
            <View style={styles.rate}>
              <Text style={styles.rateL}>Juega por</Text>
              <Text style={styles.rateN}>{formatArs(pricePerMatch!)}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      {showFavorite ? (
        <Pressable
          onPress={onFavoritePress}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Sacar de favoritos" : "Agregar a favoritos"}
          style={styles.heart}
        >
          <Heart
            color={favorite ? colors.gold : colors.white}
            fill={favorite ? colors.gold : "none"}
            size={20}
            strokeWidth={iconStroke}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", position: "relative" },
  card: {
    width: "100%",
    minHeight: 122,
    flexDirection: "row",
    alignItems: "center",
    gap: space[12],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[12],
  },
  pressed: { backgroundColor: colors.surfaceHover, transform: [{ scale: 0.99 }] },
  mid: { flex: 1, minWidth: 0, gap: 4 },
  name: {
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.white,
  },
  user: {
    fontFamily: fontFamily.ui,
    fontSize: 12,
    color: colors.sky,
  },
  posRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  zone: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  zoneTxt: typeStyle("caption", colors.textSecondary),
  fmt: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  right: { alignItems: "flex-end", justifyContent: "flex-start", gap: 6, minWidth: 96, maxWidth: 120 },
  heart: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.navyDark,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    elevation: 4,
  },
  rate: { alignItems: "flex-end" },
  rateL: typeStyle("caption", colors.textSecondary),
  rateN: {
    fontFamily: fontFamily.numBold,
    fontSize: 22,
    lineHeight: 24,
    color: colors.white,
  },
});
