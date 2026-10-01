import { StyleSheet } from "react-native";
import Svg, { Defs, Ellipse, Line, Path, RadialGradient, Stop } from "react-native-svg";
import { colors } from "@shared/design";

/** Decoración del header. No forma parte del archivo de logo. */
export function HeaderDecor() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 390 128" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id="plcGlow" cx="50%" cy="38%" rx="48%" ry="55%">
          <Stop offset="0%" stopColor={colors.sky} stopOpacity="0.16" />
          <Stop offset="70%" stopColor={colors.navy} stopOpacity="0.04" />
          <Stop offset="100%" stopColor={colors.navyDark} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="195" cy="52" rx="150" ry="46" fill="url(#plcGlow)" />
      <Path
        d="M-8 78 C 28 18, 72 22, 108 64"
        stroke={colors.sky}
        strokeWidth="2.2"
        fill="none"
        opacity="0.38"
      />
      <Path
        d="M8 96 C 70 28, 130 36, 188 88"
        stroke={colors.surface}
        strokeWidth="10"
        fill="none"
        opacity="0.55"
      />
      <Line x1="92" y1="108" x2="298" y2="108" stroke={colors.sky} strokeWidth="0.7" opacity="0.14" />
      <Line x1="195" y1="88" x2="195" y2="118" stroke={colors.sky} strokeWidth="0.6" opacity="0.12" />
      <Path
        d="M132 108 C 158 96, 232 96, 258 108"
        stroke={colors.sky}
        strokeWidth="0.6"
        fill="none"
        opacity="0.12"
      />
    </Svg>
  );
}
