import { useState } from "react";
import { Pressable, Text } from "react-native";
import { firstZodError, registerSchema } from "@shared/validation/auth";
import { colors } from "@shared/design";
import { supabase } from "../../lib/supabase";
import { emailRedirectConfirm } from "../../lib/web-url";
import { BrandLogo, Button, ErrorText, Field, Heading, InfoText, Lead, Screen } from "../../ui";
import { typeStyle } from "../../ui/textStyle";
import { SocialAuthButtons } from "./SocialAuthButtons";

type Props = { onGoLogin: () => void; onSkip?: () => void };

export function RegisterScreen({ onGoLogin, onSkip }: Props) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const parsed = registerSchema.safeParse({ nombre, email, password });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: emailRedirectConfirm(),
        data: {
          nombre: parsed.data.nombre,
          origen_registro: "porlacancha",
        },
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setInfo("Cuenta creada. Si pedimos confirmar email, abrí el link en este teléfono.");
  };

  return (
    <Screen scroll>
      <BrandLogo size="md" />
      <Heading>Crear cuenta</Heading>
      <Lead>Sirve también para reservar en FulbitoYa.</Lead>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {info ? <InfoText>{info}</InfoText> : null}
      <Field placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <Field
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        secureTextEntry
        placeholder="Contraseña (mín. 8)"
        value={password}
        onChangeText={setPassword}
      />
      <Button label={loading ? "Creando..." : "Registrarme"} onPress={submit} loading={loading} />
      <SocialAuthButtons />
      <Pressable onPress={onGoLogin} style={{ marginTop: 20 }}>
        <Text style={typeStyle("bodySmall", colors.gold)}>Ya tengo cuenta</Text>
      </Pressable>
      {onSkip ? (
        <Pressable onPress={onSkip} style={{ marginTop: 22 }}>
          <Text style={typeStyle("bodySmall", colors.sky)}>Seguir mirando sin cuenta</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
