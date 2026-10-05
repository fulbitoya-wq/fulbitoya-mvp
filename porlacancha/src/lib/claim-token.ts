import { setPendingAction } from "./pending-action";

export function extractClaimToken(url: string | null): string | null {
  if (!url) return null;
  const match =
    url.match(/porlacancha:\/\/r\/([a-fA-F0-9]+)/) ||
    url.match(/\/r\/([a-fA-F0-9]+)/);
  return match?.[1] ?? null;
}

export async function rememberClaimTokenFromUrl(url: string | null) {
  const token = extractClaimToken(url);
  if (!token) return;
  await setPendingAction({ kind: "claim_reserva", token });
}
