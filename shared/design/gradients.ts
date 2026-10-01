import { colors } from "./colors";

export const gradients = {
  hero: {
    angle: 135,
    stops: [
      { color: colors.navyDark, at: "0%" },
      { color: colors.navy, at: "55%" },
      { color: colors.surface, at: "100%" },
    ],
  },
  gold: {
    angle: 135,
    stops: [
      { color: colors.goldLight, at: "0%" },
      { color: colors.gold, at: "100%" },
    ],
  },
} as const;

export const gradientCss = {
  hero: `linear-gradient(135deg, ${colors.navyDark} 0%, ${colors.navy} 55%, ${colors.surface} 100%)`,
  gold: `linear-gradient(135deg, ${colors.goldLight} 0%, ${colors.gold} 100%)`,
} as const;

export const gradientRn = {
  hero: [colors.navyDark, colors.navy, colors.surface] as const,
  gold: [colors.goldLight, colors.gold] as const,
};
