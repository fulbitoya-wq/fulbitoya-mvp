/** Silueta propia PorLaCancha. ViewBox 84×98 (≈0.86:1). */

export const SHIELD_VB = { w: 84, h: 98 } as const;
const CX = 42;
const CY = 50;

function pt(x: number, y: number, scale: number): string {
  return `${(CX + (x - CX) * scale).toFixed(2)} ${(CY + (y - CY) * scale).toFixed(2)}`;
}

/** Escudo vertical: corona con quiebres, cintura suave, punta inferior. */
export function shieldPath(scale = 1): string {
  const p = (x: number, y: number) => pt(x, y, scale);
  return [
    `M${p(42, 2.3)}`,
    `C${p(39.1, 4.5)} ${p(36.6, 6.4)} ${p(34.1, 8.1)}`,
    `L${p(31.5, 10)}`,
    `L${p(29.2, 7.1)}`,
    `L${p(26.6, 10.3)}`,
    `L${p(24.1, 7.4)}`,
    `L${p(20.4, 12.1)}`,
    `C${p(15.2, 15.6)} ${p(11.1, 17.9)} ${p(8.3, 20.7)}`,
    `C${p(5.4, 29.6)} ${p(7.4, 41.2)} ${p(11.6, 52)}`,
    `C${p(13.4, 58.5)} ${p(10.6, 66.5)} ${p(16.8, 77.2)}`,
    `C${p(23.2, 86.4)} ${p(31, 93)} ${p(42, 96.7)}`,
    `C${p(53, 93)} ${p(60.8, 86.4)} ${p(67.2, 77.2)}`,
    `C${p(73.4, 66.5)} ${p(70.6, 58.5)} ${p(72.4, 52)}`,
    `C${p(76.6, 41.2)} ${p(78.6, 29.6)} ${p(75.7, 20.7)}`,
    `C${p(72.9, 17.9)} ${p(68.8, 15.6)} ${p(63.6, 12.1)}`,
    `L${p(59.9, 7.4)}`,
    `L${p(57.4, 10.3)}`,
    `L${p(54.8, 7.1)}`,
    `L${p(52.5, 10)}`,
    `L${p(49.9, 8.1)}`,
    `C${p(47.4, 6.4)} ${p(44.9, 4.5)} ${p(42, 2.3)}`,
    "Z",
  ].join(" ");
}

export const SHIELD_OUTER = shieldPath(1);
export const SHIELD_CLIP = shieldPath(0.9);
export const SHIELD_INNER = shieldPath(0.82);

export function shieldCrownGleam(scale = 0.88): string {
  const p = (x: number, y: number) => pt(x, y, scale);
  return `M${p(20.5, 19.2)} Q${p(42, 8.4)} ${p(63.5, 19.2)}`;
}
