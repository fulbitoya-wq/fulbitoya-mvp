import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, gradientRn, radius } from "@shared/design";
import { Trophy, iconStroke } from "../lib/icons";

type Props = {
  height: number;
  width?: number;
  variant?: "banner" | "thumb" | "flush";
  children?: ReactNode;
};

export function PitchCover({ height, width, variant = "banner", children }: Props) {
  const shape = variant === "thumb" ? styles.thumb : variant === "flush" ? styles.flush : styles.banner;
  return (
    <View style={[styles.wrap, shape, { height, width }]}>
      <LinearGradient colors={[...gradientRn.hero]} style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Trophy color={colors.gold} size={variant === "thumb" ? 22 : 28} strokeWidth={iconStroke} />
        </View>
      </LinearGradient>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    position: "relative",
  },
  banner: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  flush: { borderRadius: 0 },
  thumb: {
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
