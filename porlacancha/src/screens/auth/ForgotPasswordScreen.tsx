import { useState } from "react";
import { Pressable, Text } from "react-native";
import { firstZodError, forgotPasswordSchema } from "@shared/validation/auth";
import { colors } from "@shared/design";
import { supabase } from "../../lib/supabase";
import { emailRedirectReset } from "../../lib/web-url";
import { BrandLogo, Button, ErrorText, Field, Heading, InfoText, Screen } from "../../ui";
import { typeStyle } from "../../ui/textStyle";

type Props = { onBack: () => void };

export function ForgotPasswordScreen({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
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
    setInfo("Si el email existe, te mandamos un link. Abrilo en este teléfono.");
  };

  return (
    <Screen scroll>
      <BrandLogo size="sm" />
      <Heading>Olvidé mi contraseña</Heading>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {info ? <InfoText>{info}</InfoText> : null}
      <Field
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <Button label={loading ? "Enviando..." : "Enviar link"} onPress={submit} loading={loading} />
      <Pressable onPress={onBack} style={{ marginTop: 20 }}>
        <Text style={typeStyle("bodySmall", colors.gold)}>Volver a ingresar</Text>
      </Pressable>
    </Screen>
  );
}
