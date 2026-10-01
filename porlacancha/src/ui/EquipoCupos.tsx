import { colors } from "@shared/design";
import { Image, StyleSheet, Text, View } from "react-native";
import { CUPOS_DESAFIO, etiquetaTipo, type Desafio } from "../lib/desafios";
import { typeStyle } from "./textStyle";

type Props = {
  desafio: Desafio;
};

export function EquipoCupos({ desafio }: Props) {
  const taken = desafio.inscritos ?? [];
  const cupos = desafio.cupos || CUPOS_DESAFIO;
  const slots = Array.from({ length: cupos }, (_, i) => taken[i] ?? null);

  return (
    <View style={styles.row}>
      <View style={styles.avs}>
        {slots.map((eq, i) =>
          eq?.escudo_url ? (
            <Image key={eq.id} source={{ uri: eq.escudo_url }} style={styles.av} />
          ) : (
            <View key={eq?.id ?? `empty-${i}`} style={[styles.av, eq ? styles.avFill : styles.avEmpty]} />
          )
        )}
        <Text style={styles.cupo}>
          {taken.length} de {cupos}
        </Text>
      </View>
      <Text style={styles.fmt}>{etiquetaTipo(desafio.tipo)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avs: { flexDirection: "row", alignItems: "center", gap: 6 },
  av: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  avFill: { backgroundColor: colors.surfaceHover },
  avEmpty: {
    backgroundColor: "transparent",
    borderStyle: "dashed",
    borderColor: colors.textSecondary,
  },
  cupo: typeStyle("caption", colors.textSecondary),
  fmt: typeStyle("caption", colors.white),
});
