import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { extractJoinToken } from "../lib/join-token";
import { aplicarTokenUnirse } from "../lib/join-flow";
import { Button } from "../ui";
import { typeStyle } from "../ui/textStyle";
import { fontFamily } from "../lib/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
};

export function UnirseEnlaceSheet({ visible, onClose, onJoined }: Props) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const token = extractJoinToken(raw.trim()) ?? raw.trim();
    if (!token) return;
    setBusy(true);
    const ok = await aplicarTokenUnirse(token);
    setBusy(false);
    if (ok) {
      setRaw("");
      onJoined();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.bg} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.h}>Unirme con un enlace</Text>
          <Text style={styles.p}>Pegá el link que te mandó el capitán o el token.</Text>
          <TextInput
            value={raw}
            onChangeText={setRaw}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="porlacancha.com/e/…"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
          <View style={{ marginTop: space[16], gap: space[8] }}>
            <Button label={busy ? "Enviando..." : "Pedir entrar"} onPress={() => void send()} loading={busy} />
            <Button label="Cerrar" variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.navyDark,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: space[24],
  },
  h: typeStyle("h3", colors.white),
  p: { ...typeStyle("bodySmall", colors.textSecondary), marginTop: space[8], marginBottom: space[12] },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    paddingHorizontal: space[16],
    color: colors.white,
    fontFamily: fontFamily.ui,
    fontSize: 16,
    backgroundColor: colors.navy,
  },
});
