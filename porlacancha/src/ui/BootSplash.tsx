import { colors, space } from "@shared/design";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { BrandLogo } from "./BrandLogo";

type Props = {
  visible: boolean;
};

export function BootSplash({ visible }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const glow = useRef(new Animated.Value(0.4)).current;
  const shown = useRef(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.4,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [glow, scale]);

  useEffect(() => {
    if (!visible && shown.current) {
      shown.current = false;
      Animated.timing(opacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity]);

  return (
    <Animated.View pointerEvents={visible ? "auto" : "none"} style={[StyleSheet.absoluteFill, { opacity }]}>
      <LinearGradient colors={[colors.navyDark, colors.navy]} style={styles.fill}>
        <View style={styles.center}>
          <Animated.View style={[styles.haloWrap, { opacity: glow }]}>
            <View style={styles.halo} />
          </Animated.View>
          <Svg pointerEvents="none" width={320} height={320} style={styles.pitch}>
            <Line x1="40" y1="160" x2="280" y2="160" stroke={colors.gold} strokeWidth="1" opacity="0.12" />
            <Line x1="160" y1="48" x2="160" y2="272" stroke={colors.gold} strokeWidth="1" opacity="0.1" />
            <Path
              d="M70 160 C 70 110, 250 110, 250 160 C 250 210, 70 210, 70 160"
              stroke={colors.gold}
              strokeWidth="1"
              fill="none"
              opacity="0.1"
            />
          </Svg>
          <Animated.View style={[styles.logo, { transform: [{ scale }] }]}>
            <BrandLogo size="lg" />
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", justifyContent: "center" },
  haloWrap: {
    position: "absolute",
    alignSelf: "center",
  },
  halo: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.sky,
    opacity: 0.12,
  },
  pitch: { position: "absolute" },
  logo: { paddingHorizontal: space[20] },
});
