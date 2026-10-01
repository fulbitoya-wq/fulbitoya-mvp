import { PlayerRankShield } from "./PlayerRankShield";
import type { PlayerRange } from "../../lib/player-ranks";

type Props = {
  name: string;
  avatarUrl?: string;
  level?: number;
  range: PlayerRange;
  size?: "compact" | "hero";
};

export function PlayerAvatarShield(props: Props) {
  return <PlayerRankShield {...props} />;
}
