import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { firstZodError, loginSchema } from "@shared/validation/auth";
import { supabase } from "../../lib/supabase";
import { AuthScreen, BrandLogo, Button, Field } from "../../ui";
import { typeStyle } from "../../ui/textStyle";
import { colors } from "@shared/design";
import { fontFamily } from "../../lib/fonts";
import { AuthBackBar } from "./AuthBackBar";
import { SocialAuthButtons } from "./SocialAuthButtons";

type Props = {
  onGoRegister: () => void;
  onGoForgot: () => void;
  onSkip?: () => void;
};

export function LoginScreen({ onGoRegister, onGoForgot, onSkip }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (err) setError("Email o contraseña incorrectos");
  };

  return (
    <AuthScreen>
      {onSkip ? <AuthBackBar onBack={onSkip} label="Volver al inicio" /> : null}
      <View style={styles.logo}>
        <BrandLogo size="md" />
      </View>
      <Field
        leftIcon="mail"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email o usuario"
        value={email}
        invalid={Boolean(error)}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
      />
      <Field
        leftIcon="lock"
        secureTextEntry
        placeholder="Contraseña"
        value={password}
        invalid={Boolean(error)}
        error={error}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError(null);
        }}
      />
      <Pressable onPress={onGoForgot} style={styles.forgot}>
        <Text style={styles.forgotTxt}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      <Button label={loading ? "Ingresando..." : "Iniciar sesión"} onPress={submit} loading={loading} />
      <SocialAuthButtons />
      {onSkip ? (
        <Pressable onPress={onSkip} style={styles.skip}>
          <Text style={typeStyle("bodySmall", colors.sky)}>Seguir mirando sin cuenta</Text>
        </Pressable>
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.footerMute}>¿Ya tenés cuenta? </Text>
        <Pressable onPress={onGoRegister} accessibilityRole="button" accessibilityLabel="Registrate">
          <Text style={styles.footerLink}>Registrate</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  logo: { paddingBottom: 36 },
  forgot: { alignSelf: "stretch", marginTop: -4, marginBottom: 16 },
  forgotTxt: {
    ...typeStyle("bodySmall", colors.sky),
    textAlign: "center",
  },
  skip: { marginTop: 18, alignItems: "center" },
  footer: {
    marginTop: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  footerMute: {
    ...typeStyle("bodySmall", colors.textSecondary),
  },
  footerLink: {
    ...typeStyle("bodySmall", colors.sky),
    fontFamily: fontFamily.uiBold,
  },
});
