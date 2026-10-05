import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { guardarListaReserva, listarListaReserva } from "../lib/reserva";
import { AuthBackBar } from "./auth/AuthBackBar";
import { Button, Heading, Lead, Screen, showNotice } from "../ui";
import { fontFamily } from "../lib/fonts";

type Props = {
  reservaId: string;
  onBack: () => void;
};

export function ReservaListaScreen({ reservaId, onBack }: Props) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listarListaReserva(reservaId).then((r) => {
      if (r.ok) setRaw(r.nombres.join("\n"));
    });
  }, [reservaId]);

  const save = async () => {
    setBusy(true);
    const nombres = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await guardarListaReserva(reservaId, nombres);
    setBusy(false);
    if (!res.ok) {
      showNotice("No se pudo guardar", res.error);
      return;
    }
    showNotice("Lista", "Quedaron cargados los que anotaste (con cuenta o invitados).");
    onBack();
  };

  return (
    <Screen scroll>
      <AuthBackBar onBack={onBack} />
      <Heading>Quién juega</Heading>
      <Lead>Un nombre por renglón. Podés anotar invitados aunque no tengan cuenta.</Lead>
      <TextInput
        value={raw}
        onChangeText={setRaw}
        multiline
        placeholder={"Ana\nLuis\nInvitado de Juan"}
        placeholderTextColor={colors.textSecondary}
        style={{
          minHeight: 180,
          borderWidth: 1,
          borderColor: colors.gold,
          borderRadius: radius.md,
          padding: space[12],
          color: colors.white,
          fontFamily: fontFamily.ui,
          textAlignVertical: "top",
        }}
      />
      <View style={{ height: space[16] }} />
      <Button label={busy ? "Guardando..." : "Guardar lista"} onPress={() => void save()} loading={busy} />
    </Screen>
  );
}
