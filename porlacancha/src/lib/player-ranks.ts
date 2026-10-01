import { PLAYER_RANKS, type PlayerRange } from "@shared/design";

export type { PlayerRange };
export { PLAYER_RANKS };

export function getPlayerRank(level: number | null, verifiedMatches: number): PlayerRange {
  if (verifiedMatches < 5) return "new";
  const lv = level ?? 0;
  if (lv <= 59) return "bronze";
  if (lv <= 74) return "silver";
  if (lv <= 89) return "gold";
  return "elite";
}

export function formatArs(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
