import { useState } from "react";
import { Pressable, Text } from "react-native";
import { firstZodError, forgotPasswordSchema } from "@shared/validation/auth";
import { colors } from "@shared/design";
import { supabase } from "../../lib/supabase";
import { emailRedirectReset } from "../../lib/web-url";
import { AuthScreen, BrandLogo, Button, Field, Heading } from "../../ui";
import { typeStyle } from "../../ui/textStyle";
import { AuthBackBar } from "./AuthBackBar";
import { AuthNoticeModal } from "./AuthNoticeModal";

type Props = { onBack: () => void; onSkip?: () => void };

export function ForgotPasswordScreen({ onBack, onSkip }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const goHome = () => {
    if (onSkip) onSkip();
    else onBack();
  };

  const submit = async () => {
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: emailRedirectReset(),
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
  };

  return (
    <AuthScreen>
      <AuthBackBar onBack={onBack} label="Volver a ingresar" />
      <BrandLogo size="sm" />
      <Heading>Olvidé mi contraseña</Heading>
      <Field
        leftIcon="mail"
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        invalid={Boolean(error)}
        error={error}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
      />
      <Button label={loading ? "Enviando..." : "Enviar link"} onPress={submit} loading={loading} />
      <Pressable onPress={onBack} style={{ marginTop: 20 }}>
        <Text style={typeStyle("bodySmall", colors.sky)}>Volver a ingresar</Text>
      </Pressable>
      <AuthNoticeModal
        visible={done}
        title="Mail enviado"
        body="Si ese email está en PorLaCancha, te mandamos el link para elegir una clave nueva. Revisá también spam."
        primaryLabel="Volver al inicio"
        onPrimary={goHome}
        secondaryLabel="Volver a ingresar"
        onSecondary={onBack}
      />
    </AuthScreen>
  );
}
