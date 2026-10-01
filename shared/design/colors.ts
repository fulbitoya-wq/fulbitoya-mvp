export const colors = {
  navy: "#002B62",
  navyDark: "#001B44",
  surface: "#07366D",
  surfaceHover: "#0B427F",
  surfaceElevated: "#0D4A8C",
  white: "#F7F5EF",
  textSecondary: "#B8C4D6",
  sky: "#8BC9EB",
  gold: "#D9A928",
  goldLight: "#F3D477",
  goldDark: "#A97812",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.20)",
} as const;

/** Fondos translúcidos para chips de estado (nunca comunicar estado solo con color). */
export const statusSurfaces = {
  open: "rgba(34,197,94,0.16)",
  urgent: "rgba(217,169,40,0.18)",
  complete: "rgba(139,201,235,0.18)",
  pending: "rgba(184,196,214,0.16)",
  won: "rgba(217,169,40,0.22)",
  lost: "rgba(184,196,214,0.12)",
  cancelled: "rgba(239,68,68,0.16)",
  payment: "rgba(245,158,11,0.18)",
} as const;

export type ColorName = keyof typeof colors;
