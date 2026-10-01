import { colors, type, type TypeStyle } from "@shared/design";
import type { TextStyle } from "react-native";
import { fontFamily } from "../lib/fonts";

const uiByWeight = {
  regular: fontFamily.ui,
  medium: fontFamily.uiMedium,
  semibold: fontFamily.uiSemibold,
  bold: fontFamily.uiBold,
  extrabold: fontFamily.uiExtrabold,
} as const;

const numByWeight = {
  regular: fontFamily.num,
  medium: fontFamily.num,
  semibold: fontFamily.numSemibold,
  bold: fontFamily.numBold,
  extrabold: fontFamily.numBold,
} as const;

export function typeStyle(key: keyof typeof type, color: string = colors.white): TextStyle {
  const t: TypeStyle = type[key];
  const family = t.fontFamily === "numbers" ? numByWeight[t.fontWeight] : uiByWeight[t.fontWeight];
  return {
    fontFamily: family,
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    color,
  };
}
