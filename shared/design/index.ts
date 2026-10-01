export { colors, statusSurfaces, type ColorName } from "./colors";
export { radius, radiusUsage } from "./radius";
export { space, touchMin, touchMinCompact, breakpoints } from "./spacing";
export { fonts, fontWeights, type, type TypeStyle } from "./typography";
export { shadowRn, shadowCss, type RnShadow } from "./shadow";
export { gradients, gradientCss, gradientRn } from "./gradients";
export { PLAYER_RANKS, type PlayerRange } from "./playerRanks";
export { featureFlags } from "./flags";

export const motion = {
  pressScale: 0.97,
  iconStroke: 2,
  iconStrokeSmall: 2.25,
} as const;
