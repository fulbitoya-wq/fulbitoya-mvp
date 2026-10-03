import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { MOTIVOS_REPORTE, type MotivoReporte } from "../../lib/moderacion";
import { Button } from "../../ui";
import { typeStyle } from "../../ui/textStyle";

type Mode = "menu" | "report";

type Props = {
  visible: boolean;
  blocked: boolean;
  onClose: () => void;
  onReport: (motivo: MotivoReporte, detalle: string) => void;
  onBlock: () => void;
  onUnblock: () => void;
  busy?: boolean;
};

export function ReportBlockSheet({
  visible,
  blocked,
  onClose,
  onReport,
  onBlock,
  onUnblock,
  busy,
}: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [detalle, setDetalle] = useState("");

  const close = () => {
    setMode("menu");
    setMotivo(null);
    setDetalle("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.bg} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {mode === "menu" ? (
            <>
              <Text style={styles.h}>Este perfil</Text>
              <Text style={styles.p}>Las denuncias las revisamos. El bloqueo es inmediato: no te ves más en la búsqueda.</Text>
              <View style={{ gap: space[8], marginTop: space[12] }}>
                <Button
                  label="Denunciar"
                  variant="secondary"
                  onPress={() => setMode("report")}
                  disabled={busy}
                />
                {blocked ? (
                  <Button label="Desbloquear" variant="secondary" onPress={onUnblock} disabled={busy} />
                ) : (
                  <Button label="Bloquear" variant="danger" onPress={onBlock} disabled={busy} />
                )}
                <Button label="Cerrar" variant="ghost" onPress={close} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.h}>¿Por qué lo denunciás?</Text>
              <Text style={styles.p}>Elegí un motivo. No le avisamos a esa persona.</Text>
              <View style={{ marginTop: space[12], gap: space[8] }}>
                {MOTIVOS_REPORTE.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setMotivo(m.id)}
                    style={[styles.opt, motivo === m.id && styles.optOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: motivo === m.id }}
                  >
                    <Text style={styles.optT}>{m.label}</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={detalle}
                  onChangeText={setDetalle}
                  placeholder="Detalle (opcional)"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  maxLength={400}
                  multiline
                />
                <Button
                  label="Enviar denuncia"
                  onPress={() => motivo && onReport(motivo, detalle)}
                  disabled={!motivo || busy}
                  loading={busy}
                />
                <Button label="Volver" variant="ghost" onPress={() => setMode("menu")} />
              </View>
            </>
          )}
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
  opt: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space[16],
    justifyContent: "center",
  },
  optOn: { borderColor: colors.gold },
  optT: typeStyle("bodySmall", colors.white),
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.white,
    padding: space[12],
    textAlignVertical: "top",
  },
});
