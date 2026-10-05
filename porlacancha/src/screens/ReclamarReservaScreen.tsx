import { useEffect, useState } from "react";
import { Text } from "react-native";
import { colors } from "@shared/design";
import { useAuth } from "../auth/AuthProvider";
import { emitirCodigoReclamo, verificarCodigoReclamo, verReclamo, type ReclamoVista } from "../lib/reclamar";
import { BrandLogo, Button, ErrorText, Field, Heading, Lead, Screen } from "../ui";
import { typeStyle } from "../ui/textStyle";
import { AuthBackBar } from "./auth/AuthBackBar";

type Props = {
  token: string;
  onDone: () => void;
  onCancel: () => void;
};

export function ReclamarReservaScreen({ token, onDone, onCancel }: Props) {
  const { session, refreshProfile } = useAuth();
  const [vista, setVista] = useState<ReclamoVista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [codigoPrueba, setCodigoPrueba] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    void verReclamo(token).then((r) => {
      if (r.error) setError(r.error);
      else setVista(r.data);
    });
  }, [token]);

  const enviar = async () => {
    setError(null);
    setSending(true);
    const res = await emitirCodigoReclamo(token, session?.access_token);
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.prueba && res.codigo) setCodigoPrueba(res.codigo);
  };

  const confirmar = async () => {
    setError(null);
    setVerifying(true);
    const res = await verificarCodigoReclamo(token, codigo);
    setVerifying(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refreshProfile();
    onDone();
  };

  return (
    <Screen scroll>
      <AuthBackBar onBack={onCancel} label="Ahora no" />
      <BrandLogo size="sm" />
      <Heading>Confirmá tu reserva</Heading>
      {vista ? (
        <Lead>
          {vista.cancha_nombre} · {vista.campo_nombre}
          {"\n"}
          {vista.fecha} {vista.hora_inicio}–{vista.hora_fin}
          {"\n"}
          Código al {vista.telefono_enmascarado} ({vista.titular_nombre})
        </Lead>
      ) : (
        <Lead>Cargando el turno…</Lead>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {codigoPrueba ? (
        <Text style={typeStyle("bodySmall", colors.gold)}>
          Modo prueba: tu código es {codigoPrueba}
        </Text>
      ) : null}
      <Button
        label={sending ? "Enviando..." : "Enviar código"}
        onPress={() => void enviar()}
        loading={sending}
        disabled={sending || verifying}
      />
      <Field
        keyboardType="number-pad"
        placeholder="Código de 6 dígitos"
        value={codigo}
        onChangeText={setCodigo}
        maxLength={6}
      />
      <Button
        label={verifying ? "Confirmando..." : "Confirmar reserva"}
        onPress={() => void confirmar()}
        loading={verifying}
        disabled={verifying || codigo.length < 6}
      />
    </Screen>
  );
}
