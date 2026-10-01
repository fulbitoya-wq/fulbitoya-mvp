import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { colors } from "@shared/design";
import { fontFamily } from "../../lib/fonts";
import { User, iconStroke } from "../../lib/icons";
import { initialsFromName, PLAYER_RANKS, type PlayerRange } from "../../lib/player-ranks";
import {
  SHIELD_CLIP,
  SHIELD_INNER,
  SHIELD_OUTER,
  SHIELD_VB,
  shieldCrownGleam,
} from "../../lib/player-shield";
import { PlayerLevel } from "./PlayerLevel";
import { PlayerRankBadge } from "./PlayerRankBadge";

const PHOTO_H = SHIELD_VB.h * 0.78;

type Props = {
  name: string;
  avatarUrl?: string;
  level?: number;
  range: PlayerRange;
  size?: "compact" | "hero";
  showLevel?: boolean;
  showRankLabel?: boolean;
};

export function PlayerRankShield({
  name,
  avatarUrl,
  level,
  range,
  size = "compact",
  showLevel,
  showRankLabel,
}: Props) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gid = `prs${rawId}`;
  const meta = PLAYER_RANKS[range];
  const scale = size === "hero" ? 2 : 1;
  const w = SHIELD_VB.w * scale;
  const h = SHIELD_VB.h * scale;
  const levelOnShield = showLevel ?? size !== "hero";
  const rankOnShield = showRankLabel ?? size !== "hero";
  const initials = initialsFromName(name);
  const rim = meta.shieldRim;
  const surface = meta.shieldSurface;
  const a11y =
    range === "new" ? "Nuevo en PorLaCancha" : `Rango ${meta.label}${level != null ? `, nivel ${level}` : ""}`;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: w,
          height: h,
          shadowColor: meta.accent,
          shadowOpacity: range === "new" ? 0.2 : 0.42,
        },
      ]}
      accessibilityLabel={a11y}
    >
      <Svg width={w} height={h} viewBox={`0 0 ${SHIELD_VB.w} ${SHIELD_VB.h}`}>
        <Defs>
          <LinearGradient id={`${gid}rim`} x1="12" y1="4" x2="74" y2="94" gradientUnits="userSpaceOnUse">
            {rim.map((c, i) => (
              <Stop key={c + i} offset={`${(i / Math.max(rim.length - 1, 1)) * 100}%`} stopColor={c} />
            ))}
          </LinearGradient>
          <LinearGradient id={`${gid}surf`} x1="42" y1="6" x2="42" y2="96" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={surface[0]} />
            <Stop offset="46%" stopColor={surface[1]} />
            <Stop offset="100%" stopColor={surface[2]} />
          </LinearGradient>
          <RadialGradient id={`${gid}sheen`} cx="30" cy="22" r="38" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={meta.shieldHighlight} stopOpacity="0.28" />
            <Stop offset="55%" stopColor={meta.shieldHighlight} stopOpacity="0.06" />
            <Stop offset="100%" stopColor={surface[2]} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={`${gid}ov`} x1="42" y1="42" x2="42" y2="92" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#001B44" stopOpacity="0" />
            <Stop offset="100%" stopColor="#001B44" stopOpacity="0.85" />
          </LinearGradient>
          {range === "elite" ? (
            <LinearGradient id={`${gid}elite`} x1="18" y1="6" x2="66" y2="28" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#F3D477" />
              <Stop offset="55%" stopColor="#8BC9EB" />
              <Stop offset="100%" stopColor="#D9A928" />
            </LinearGradient>
          ) : null}
          <LinearGradient id={`${gid}fade`} x1="42" y1="8" x2="42" y2="90" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="58%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#000000" />
          </LinearGradient>
          <ClipPath id={`${gid}clip`}>
            <Path d={SHIELD_CLIP} />
          </ClipPath>
          <Mask id={`${gid}mask`} maskUnits="userSpaceOnUse">
            <Path d={SHIELD_CLIP} fill={`url(#${gid}fade)`} />
          </Mask>
        </Defs>

        <Path d={SHIELD_CLIP} fill={`url(#${gid}surf)`} />
        <Path d={SHIELD_CLIP} fill={`url(#${gid}sheen)`} />

        <G clipPath={`url(#${gid}clip)`}>
          {avatarUrl ? (
            <SvgImage
              href={{ uri: avatarUrl }}
              x={8}
              y={4}
              width={68}
              height={PHOTO_H}
              preserveAspectRatio="xMidYMin slice"
              mask={`url(#${gid}mask)`}
            />
          ) : null}
          <Path d={SHIELD_CLIP} fill={`url(#${gid}ov)`} />
        </G>

        <Path
          d={SHIELD_INNER}
          fill="none"
          stroke={meta.shieldInner}
          strokeWidth={1}
          strokeOpacity={0.68}
          strokeLinejoin="round"
        />
        <Path
          d={SHIELD_OUTER}
          fill="none"
          stroke={`url(#${gid}rim)`}
          strokeWidth={2.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d={shieldCrownGleam()}
          fill="none"
          stroke={meta.shieldHighlight}
          strokeWidth={1.15}
          strokeOpacity={0.72}
          strokeLinecap="round"
        />
        {range === "elite" ? (
          <Path
            d={shieldCrownGleam(0.74)}
            fill="none"
            stroke={`url(#${gid}elite)`}
            strokeWidth={1.4}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>

      {!avatarUrl ? (
        <View style={styles.fallback} pointerEvents="none">
          {range === "new" ? (
            <User color={colors.sky} size={size === "hero" ? 56 : 28} strokeWidth={iconStroke} />
          ) : (
            <Text style={[styles.ini, { fontSize: size === "hero" ? 42 : 20 }]}>{initials}</Text>
          )}
        </View>
      ) : null}

      {levelOnShield || rankOnShield ? (
        <View style={styles.meta} pointerEvents="none">
          {levelOnShield ? <PlayerLevel level={level} range={range} size={size === "hero" ? "md" : "sm"} /> : null}
          {rankOnShield ? <PlayerRankBadge range={range} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  ini: {
    fontFamily: fontFamily.uiExtrabold,
    color: colors.white,
  },
  meta: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 10,
    alignItems: "center",
    gap: 2,
  },
});
