import { useEffect, useRef, useState } from "react";
import * as Linking from "expo-linking";
import { useAuth } from "../auth/AuthProvider";
import { aplicarTokenUnirse } from "../lib/join-flow";
import { rememberJoinTokenFromUrl } from "../lib/join-token";
import {
  clearPendingAction,
  peekPendingAction,
  profileNeedsPhone,
  profileNeedsUsername,
} from "../lib/pending-action";
import { CompletePhoneScreen } from "./auth/CompletePhoneScreen";
import { CompleteUsernameScreen } from "./auth/CompleteUsernameScreen";
import { MainTabs } from "./MainTabs";

type Props = {
  onRequestAuth: () => void;
};

export function LoggedInShell({ onRequestAuth }: Props) {
  const { session, profile } = useAuth();
  const [gate, setGate] = useState<null | "username" | "phone">(null);
  const triedJoin = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!session) {
        if (!cancelled) setGate(null);
        return;
      }
      const action = await peekPendingAction();
      if (cancelled) return;
      if (!action) {
        setGate(null);
        return;
      }
      const mustComplete =
        action.kind === "join_token" ||
        action.kind === "create_team" ||
        action.kind === "accept_invite" ||
        action.kind === "inscribir";
      if (mustComplete && profileNeedsUsername(profile)) {
        setGate("username");
        return;
      }
      if (mustComplete && profileNeedsPhone(profile)) {
        setGate("phone");
        return;
      }
      setGate(null);
      if (action.kind !== "join_token") return;
      if (triedJoin.current === action.token) return;
      triedJoin.current = action.token;
      const ok = await aplicarTokenUnirse(action.token);
      if (ok) await clearPendingAction();
    };

    void run();

    const sub = Linking.addEventListener("url", ({ url }) => {
      rememberJoinTokenFromUrl(url).then(() => {
        if (session) void run();
      });
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [session, profile, profile?.username, profile?.telefono]);

  if (session && gate === "username") {
    return <CompleteUsernameScreen />;
  }
  if (session && gate === "phone") {
    return <CompletePhoneScreen />;
  }

  return <MainTabs onRequestAuth={onRequestAuth} />;
}
