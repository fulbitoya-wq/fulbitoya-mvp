import { Image, StyleSheet, View } from "react-native";

const logo = require("../../assets/porlacancha.png");

type Size = "sm" | "md" | "lg" | "splash";

const box: Record<Size, { width: number; height: number }> = {
  sm: { width: 168, height: 52 },
  md: { width: 260, height: 82 },
  lg: { width: 300, height: 96 },
  splash: { width: 280, height: 102 },
};

export function BrandLogo({ size = "md" }: { size?: Size }) {
  const s = box[size];
  return (
    <View
      style={[styles.wrap, { width: s.width, height: s.height }]}
      accessibilityRole="image"
      accessibilityLabel="PorLaCancha"
    >
      <Image source={logo} style={{ width: s.width, height: s.height }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
  },
});
