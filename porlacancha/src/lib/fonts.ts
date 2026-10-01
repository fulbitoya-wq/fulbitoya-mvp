import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Teko_500Medium, Teko_600SemiBold, Teko_700Bold } from "@expo-google-fonts/teko";
import { useFonts } from "expo-font";

export const fontAssets = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  Teko_500Medium,
  Teko_600SemiBold,
  Teko_700Bold,
};

export function useAppFonts() {
  const [loaded, error] = useFonts(fontAssets);
  return { loaded, error };
}

export const fontFamily = {
  ui: "Manrope_400Regular",
  uiMedium: "Manrope_500Medium",
  uiSemibold: "Manrope_600SemiBold",
  uiBold: "Manrope_700Bold",
  uiExtrabold: "Manrope_800ExtraBold",
  num: "Teko_500Medium",
  numSemibold: "Teko_600SemiBold",
  numBold: "Teko_700Bold",
} as const;
