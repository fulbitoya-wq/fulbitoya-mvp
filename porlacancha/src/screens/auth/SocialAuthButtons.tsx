/**
 * Google / Apple nativos: NO instalar todavía
 *   @react-native-google-signin/google-signin
 *   expo-apple-authentication
 * Rompen Expo Go. Cuando tengas credenciales:
 * 1) npx expo install @react-native-google-signin/google-signin expo-apple-authentication
 * 2) plugin en app.config.js (iosUrlScheme + google services)
 * 3) supabase.auth.signInWithIdToken({ provider: 'google'|'apple', token })
 * 4) definir las env EXPO_PUBLIC_GOOGLE_* y EXPO_PUBLIC_APPLE_AUTH_ENABLED=true
 */
import { colors, radius } from "@shared/design";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

function googleConfigured() {
  return Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  );
}

function appleConfigured() {
  return process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true";
}

export function SocialAuthButtons() {
  const showGoogle = googleConfigured();
  const showApple = Platform.OS === "ios" && appleConfigured();
  if (!showGoogle && !showApple) return null;

  return (
    <View style={styles.wrap}>
      {showGoogle ? (
        <Pressable style={styles.btn} disabled>
          <Text style={styles.txt}>Continuar con Google (próximamente)</Text>
        </Pressable>
      ) : null}
      {showApple ? (
        <Pressable style={styles.btn} disabled>
          <Text style={styles.txt}>Continuar con Apple (próximamente)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, gap: 8 },
  btn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  txt: { color: colors.white, fontWeight: "700", fontSize: 13 },
});
