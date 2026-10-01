import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { handleAuthCallbackUrl } from "../lib/auth-deep-link";
import { rememberJoinTokenFromUrl } from "../lib/join-token";
import { supabase } from "../lib/supabase";

export type JugateLaProfile = {
  id: string;
  email: string;
  nombre: string | null;
  telefono: string | null;
  username: string | null;
  rol: "owner" | "jugador";
  origen_registro: "fulbitoya" | "porlacancha" | null;
  avatar_url: string | null;
  created_at: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: JugateLaProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  mergeProfile: (patch: Partial<JugateLaProfile>) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromUser(user: User, row: Partial<JugateLaProfile> | null): JugateLaProfile {
  const meta = user.user_metadata ?? {};
  const metaNombre = typeof meta.nombre === "string" ? meta.nombre : null;
  const metaTel = typeof meta.telefono === "string" ? meta.telefono : null;
  return {
    id: user.id,
    email: row?.email || user.email || "",
    nombre: row?.nombre ?? metaNombre,
    telefono: row?.telefono ?? metaTel,
    username: row?.username ?? null,
    rol: row?.rol === "owner" ? "owner" : "jugador",
    origen_registro: row?.origen_registro ?? null,
    avatar_url: row?.avatar_url ?? null,
    created_at: row?.created_at ?? user.created_at ?? null,
  };
}

async function loadProfile(user: User): Promise<JugateLaProfile> {
  const { data } = await supabase
    .from("usuarios")
    .select("id, email, nombre, telefono, username, rol, origen_registro, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();
  return profileFromUser(user, (data as JugateLaProfile | null) ?? null);
}

function mergeLoadedProfile(
  prev: JugateLaProfile | null,
  row: JugateLaProfile | null
): JugateLaProfile | null {
  if (!row) return prev;
  if (!prev) return row;
  return {
    ...row,
    telefono: row.telefono ?? prev.telefono,
    username: row.username ?? prev.username,
    nombre: row.nombre ?? prev.nombre,
    avatar_url: row.avatar_url ?? prev.avatar_url,
    created_at: row.created_at ?? prev.created_at,
    origen_registro: row.origen_registro ?? prev.origen_registro,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<JugateLaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  const refreshProfile = useCallback(async () => {
    const user = sessionRef.current?.user;
    if (!user) return;
    const row = await loadProfile(user);
    if (row.origen_registro == null) {
      void supabase
        .from("usuarios")
        .update({ origen_registro: "porlacancha" })
        .eq("id", user.id)
        .is("origen_registro", null);
      setProfile((prev) => mergeLoadedProfile(prev, { ...row, origen_registro: "porlacancha" }));
      return;
    }
    setProfile((prev) => mergeLoadedProfile(prev, row));
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const initial = await Linking.getInitialURL();
      await rememberJoinTokenFromUrl(initial);
      await handleAuthCallbackUrl(initial);
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      sessionRef.current = current;
      setSession(current);
      if (current?.user) {
        const row = await loadProfile(current.user);
        if (mounted) setProfile(row);
      } else if (mounted) {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    };

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      sessionRef.current = next;
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        return;
      }
      loadProfile(next.user).then((row) => {
        if (!mounted) return;
        setProfile((prev) => mergeLoadedProfile(prev, row));
      });
    });

    const linkSub = Linking.addEventListener("url", ({ url }) => {
      rememberJoinTokenFromUrl(url);
      handleAuthCallbackUrl(url);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const mergeProfile = useCallback((patch: Partial<JugateLaProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : (patch as JugateLaProfile)));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile, mergeProfile, signOut }),
    [session, profile, loading, refreshProfile, mergeProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
