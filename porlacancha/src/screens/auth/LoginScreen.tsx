import { useState } from "react";
import { Pressable, Text } from "react-native";
import { firstZodError, loginSchema } from "@shared/validation/auth";
import { supabase } from "../../lib/supabase";
import { BrandLogo, Button, ErrorText, Field, Heading, Lead, Screen } from "../../ui";
import { typeStyle } from "../../ui/textStyle";
import { colors } from "@shared/design";
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
    if (err) setError("Email o contraseña incorrectos.");
  };

  return (
    <Screen scroll>
      <BrandLogo size="md" />
      <Heading>Ingresar</Heading>
      <Lead>La misma cuenta que FulbitoYa. Email y contraseña.</Lead>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        secureTextEntry
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
      />
      <Button label={loading ? "Ingresando..." : "Ingresar"} onPress={submit} loading={loading} />
      <SocialAuthButtons />
      <Pressable onPress={onGoForgot} style={{ marginTop: 20 }}>
        <Text style={typeStyle("bodySmall", colors.gold)}>Olvidé mi contraseña</Text>
      </Pressable>
      <Pressable onPress={onGoRegister} style={{ marginTop: 14 }}>
        <Text style={typeStyle("bodySmall", colors.gold)}>Crear cuenta</Text>
      </Pressable>
      {onSkip ? (
        <Pressable onPress={onSkip} style={{ marginTop: 22 }}>
          <Text style={typeStyle("bodySmall", colors.sky)}>Seguir mirando sin cuenta</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
