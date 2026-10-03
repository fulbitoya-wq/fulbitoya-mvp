import { LinearGradient } from "expo-linear-gradient";
import { colors, motion, radius, space, gradientRn } from "@shared/design";
import { fontFamily } from "../lib/fonts";
import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { hapticLight, hapticMedium } from "../lib/haptics";
import { typeStyle } from "./textStyle";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  accent?: "default" | "success";
  fill?: boolean;
};

const ctaHeight = 56;

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  accent = "default",
  fill,
}: Props) {
  const off = disabled || loading;
  const onTap = () => {
    void (variant === "primary" ? hapticMedium() : hapticLight());
    onPress();
  };

  const inner = (onGold: boolean) =>
    loading ? (
      <ActivityIndicator color={onGold ? colors.navyDark : colors.gold} />
    ) : (
      <View style={styles.row}>
        {icon}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[
            styles.label,
            variant === "primary" && styles.labelOnGold,
            variant === "secondary" && styles.labelSecondary,
            variant === "danger" && styles.labelDanger,
          ]}
        >
          {label}
        </Text>
      </View>
    );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={onTap}
      style={({ pressed }) => [
        fill && styles.fill,
        off && styles.off,
        pressed && !off && { transform: [{ scale: motion.pressScale }] },
      ]}
    >
      {({ pressed }) =>
        variant === "primary" ? (
          <LinearGradient
            colors={pressed && !off ? [colors.gold, colors.goldDark] : [...gradientRn.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, styles.primary, fill && styles.fill]}
          >
            {inner(true)}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.base,
              variant === "secondary" && styles.secondary,
              variant === "secondary" && accent === "success" && styles.secondarySuccess,
              variant === "ghost" && styles.ghost,
              variant === "danger" && styles.danger,
            ]}
          >
            {inner(false)}
          </View>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ctaHeight,
    borderRadius: radius.pill,
    paddingHorizontal: space[16],
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    height: 56,
    borderRadius: 28,
    shadowColor: colors.gold,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  secondarySuccess: {
    borderColor: colors.success,
  },
  ghost: {
    backgroundColor: "transparent",
    borderRadius: radius.lg,
  },
  danger: {
    backgroundColor: "rgba(239,68,68,0.16)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: radius.lg,
  },
  fill: { flex: 1 },
  off: { opacity: 0.55 },
  row: { flexDirection: "row", alignItems: "center", gap: space[8] },
  label: {
    ...typeStyle("h3", colors.white),
    fontFamily: fontFamily.uiSemibold,
    fontSize: 16,
  },
  labelOnGold: { color: colors.navyDark },
  labelSecondary: { color: colors.white },
  labelDanger: { color: colors.danger },
});
