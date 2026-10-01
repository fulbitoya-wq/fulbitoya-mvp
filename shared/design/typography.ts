export const fonts = {
  ui: "Manrope",
  numbers: "Teko",
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

export type TypeStyle = {
  fontFamily: "ui" | "numbers";
  fontSize: number;
  lineHeight: number;
  fontWeight: keyof typeof fontWeights;
  letterSpacing?: number;
};

export const type = {
  display: { fontFamily: "ui", fontSize: 34, lineHeight: 38, fontWeight: "extrabold" },
  h1: { fontFamily: "ui", fontSize: 28, lineHeight: 32, fontWeight: "extrabold" },
  h2: { fontFamily: "ui", fontSize: 22, lineHeight: 28, fontWeight: "bold" },
  h3: { fontFamily: "ui", fontSize: 18, lineHeight: 24, fontWeight: "bold" },
  body: { fontFamily: "ui", fontSize: 16, lineHeight: 24, fontWeight: "regular" },
  bodySmall: { fontFamily: "ui", fontSize: 14, lineHeight: 20, fontWeight: "regular" },
  caption: { fontFamily: "ui", fontSize: 12, lineHeight: 16, fontWeight: "medium" },
  label: { fontFamily: "ui", fontSize: 12, lineHeight: 16, fontWeight: "bold", letterSpacing: 0.6 },
  numXL: { fontFamily: "numbers", fontSize: 48, lineHeight: 48, fontWeight: "bold" },
  numL: { fontFamily: "numbers", fontSize: 32, lineHeight: 34, fontWeight: "semibold" },
  numM: { fontFamily: "numbers", fontSize: 24, lineHeight: 26, fontWeight: "semibold" },
} as const satisfies Record<string, TypeStyle>;
