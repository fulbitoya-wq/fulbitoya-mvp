import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import type { EquipoListItem } from "../../lib/equipos";
import { Button } from "../../ui";
import { typeStyle } from "../../ui/textStyle";

type Props = {
  visible: boolean;
  teams: EquipoListItem[];
  onClose: () => void;
  onPick: (equipoId: string) => void;
};

export function InviteTeamSheet({ visible, teams, onClose, onPick }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.bg} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.h}>¿A qué equipo lo invitás?</Text>
          {teams.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onPick(t.id)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`Invitar a ${t.nombre}`}
            >
              <Text style={styles.name}>{t.nombre}</Text>
              <Text style={styles.meta}>{t.formato_habitual ? t.formato_habitual.toUpperCase() : "Capitán"}</Text>
            </Pressable>
          ))}
          <View style={{ marginTop: space[16] }}>
            <Button label="Cancelar" variant="secondary" onPress={onClose} />
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
  h: { ...typeStyle("h3", colors.white), marginBottom: space[16] },
  row: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    marginBottom: space[8],
  },
  name: typeStyle("body", colors.white),
  meta: typeStyle("caption", colors.sky),
});
