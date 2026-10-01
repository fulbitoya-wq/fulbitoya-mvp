import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { Button } from "../ui";
import { typeStyle } from "../ui/textStyle";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCrearEquipo: () => void;
  onBuscarJugadores: () => void;
  onUnirmeEnlace: () => void;
  onBuscarDesafio: () => void;
};

export function PlusActionsSheet({
  visible,
  onClose,
  onCrearEquipo,
  onBuscarJugadores,
  onUnirmeEnlace,
  onBuscarDesafio,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.bg} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.h}>¿Qué querés hacer?</Text>
          <Text style={styles.p}>Los desafíos los publica el predio. Acá armás el plantel y te anotas.</Text>
          <View style={{ gap: space[8], marginTop: space[12] }}>
            <Button label="Crear equipo" onPress={onCrearEquipo} />
            <Button label="Buscar jugadores" variant="secondary" onPress={onBuscarJugadores} />
            <Button label="Unirme con un enlace" variant="secondary" onPress={onUnirmeEnlace} />
            <Button label="Buscar desafío cerca" variant="secondary" onPress={onBuscarDesafio} />
            <Button label="Cerrar" variant="ghost" onPress={onClose} />
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
  p: { ...typeStyle("bodySmall", colors.textSecondary), marginTop: space[8] },
});
