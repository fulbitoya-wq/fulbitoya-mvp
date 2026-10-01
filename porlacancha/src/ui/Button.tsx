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
};

const ctaHeight = space[48] + space[8];

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  accent = "default",
}: Props) {
  const off = disabled || loading;
  const onTap = () => {
    void (variant === "primary" ? hapticMedium() : hapticLight());
    onPress();
  };

  const inner = loading ? (
    <ActivityIndicator color={variant === "primary" ? colors.navyDark : colors.gold} />
  ) : (
    <View style={styles.row}>
      {icon}
      <Text
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
        off && styles.off,
        pressed && !off && { transform: [{ scale: motion.pressScale }] },
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={[...gradientRn.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.base}>
          {inner}
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
          {inner}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: ctaHeight,
    borderRadius: radius.pill,
    paddingHorizontal: space[24],
    alignItems: "center",
    justifyContent: "center",
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
