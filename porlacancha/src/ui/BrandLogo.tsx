import { Image, StyleSheet, View } from "react-native";

const logo = require("../../assets/logo.jpeg");

type Size = "sm" | "md" | "lg";

const diameter: Record<Size, number> = {
  sm: 88,
  md: 156,
  lg: 220,
};

export function BrandLogo({ size = "md" }: { size?: Size }) {
  const d = diameter[size];
  return (
    <View
      style={[styles.wrap, { width: d, height: d, borderRadius: d / 2 }]}
      accessibilityRole="image"
      accessibilityLabel="PorLaCancha"
    >
      <Image source={logo} style={{ width: d, height: d }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    alignSelf: "center",
  },
});
