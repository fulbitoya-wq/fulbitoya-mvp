import { colors } from "./colors";

export type RnShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const navyShadow = colors.navyDark;

export const shadowRn = {
  sm: {
    shadowColor: navyShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: navyShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: navyShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.48,
    shadowRadius: 24,
    elevation: 10,
  },
  goldGlow: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
} as const satisfies Record<string, RnShadow>;

export const shadowCss = {
  sm: "0 2px 8px rgba(0, 27, 68, 0.45)",
  md: "0 8px 20px rgba(0, 27, 68, 0.42)",
  lg: "0 16px 40px rgba(0, 27, 68, 0.5)",
  goldGlow: "0 8px 28px rgba(217, 169, 40, 0.38)",
} as const;
