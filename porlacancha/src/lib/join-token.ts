import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPendingAction } from "./pending-action";

const PENDING_JOIN_KEY = "porlacancha_pending_join_token";

export function extractJoinToken(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/equipo\/unirse\/([a-fA-F0-9]+)/) || url.match(/\/e\/([a-fA-F0-9]+)/);
  return match?.[1] ?? null;
}

export async function rememberJoinTokenFromUrl(url: string | null) {
  const token = extractJoinToken(url);
  if (!token) return;
  await AsyncStorage.setItem(PENDING_JOIN_KEY, token);
  await setPendingAction({ kind: "join_token", token });
}

export async function consumePendingJoinToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(PENDING_JOIN_KEY);
  if (token) await AsyncStorage.removeItem(PENDING_JOIN_KEY);
  return token;
}
