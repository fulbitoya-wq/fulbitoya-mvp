import { AuthProvider, useAuth } from "./src/auth/AuthProvider";
import { AuthStack } from "./src/screens/auth/AuthStack";
import { LoggedInShell } from "./src/screens/LoggedInShell";
import { useAppFonts } from "./src/lib/fonts";
import { BootSplash, AppDialogHost } from "./src/ui";
import { colors } from "@shared/design";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Root() {
  const { session, loading } = useAuth();
  const [wantAuth, setWantAuth] = useState(false);

  useEffect(() => {
    if (session) setWantAuth(false);
  }, [session]);

  if (loading) {
    return <View style={styles.boot} />;
  }

  if (!session && wantAuth) {
    return <AuthStack onSkip={() => setWantAuth(false)} />;
  }

  return <LoggedInShell onRequestAuth={() => setWantAuth(true)} />;
}

function BootGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [show, setShow] = useState(true);
  const [mounted, setMounted] = useState(true);
  const minElapsed = useRef(false);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    const t = setTimeout(() => {
      minElapsed.current = true;
      if (!loadingRef.current) setShow(false);
    }, 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && minElapsed.current) setShow(false);
  }, [loading]);

  useEffect(() => {
    if (show) return;
    const t = setTimeout(() => setMounted(false), 450);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <View style={styles.fill}>
      {children}
      {mounted ? <BootSplash visible={show} /> : null}
    </View>
  );
}

export default function App() {
  const { loaded, error } = useAppFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BootGate>
          <Root />
        </BootGate>
        <AppDialogHost />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.navy },
  boot: { flex: 1, backgroundColor: colors.navy },
});
