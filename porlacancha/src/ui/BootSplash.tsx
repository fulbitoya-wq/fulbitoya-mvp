import { colors } from "@shared/design";
import { useEffect, useRef } from "react";
import { Animated, Easing, ImageBackground, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { BrandLogo } from "./BrandLogo";

const fondoLogin = require("../../assets/fondo-login.jpeg");

type Props = {
  visible: boolean;
};

function BouncingBall({
  size,
  startX,
  startY,
  durX,
  durY,
}: {
  size: number;
  startX: number;
  startY: number;
  durX: number;
  durY: number;
}) {
  const { width, height } = useWindowDimensions();
  const x = useRef(new Animated.Value(startX)).current;
  const y = useRef(new Animated.Value(startY)).current;
  const maxX = Math.max(8, width - size - 8);
  const maxY = Math.max(8, height - size - 8);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: maxX, duration: durX, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x, { toValue: 8, duration: durX, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: maxY, duration: durY, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: 8, duration: durY, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, [durX, durY, maxX, maxY, x, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ball, { width: size, height: size, transform: [{ translateX: x }, { translateY: y }] }]}
    >
      <Text style={{ fontSize: size * 0.72, lineHeight: size }} accessibilityLabel="Pelota">
        ⚽
      </Text>
    </Animated.View>
  );
}

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
      <ImageBackground source={fondoLogin} style={styles.fill} resizeMode="cover">
        <View style={styles.dim}>
          <View pointerEvents="none" style={styles.balls}>
            <BouncingBall size={44} startX={20} startY={80} durX={2200} durY={1700} />
            <BouncingBall size={34} startX={200} startY={40} durX={1800} durY={2400} />
            <BouncingBall size={52} startX={80} startY={320} durX={2600} durY={1500} />
          </View>
          <View style={styles.center}>
            <Animated.View pointerEvents="none" style={[styles.halo, { opacity: glow }]} />
            <Animated.View style={[styles.logo, { transform: [{ scale }] }]}>
              <BrandLogo size="splash" />
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.navyDark },
  dim: {
    flex: 1,
    backgroundColor: "rgba(0,27,68,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  balls: { ...StyleSheet.absoluteFillObject },
  ball: { position: "absolute", left: 0, top: 0, alignItems: "center", justifyContent: "center" },
  center: {
    width: 320,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(247,245,239,0.18)",
  },
  logo: {
    zIndex: 2,
  },
});
