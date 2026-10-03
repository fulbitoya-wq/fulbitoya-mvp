import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { Button } from "./Button";
import { typeStyle } from "./textStyle";

export type AppDialogAction = {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  onPress?: () => void;
};

export type AppDialogPayload = {
  title: string;
  body: string;
  actions: AppDialogAction[];
};

type Listener = (payload: AppDialogPayload | null) => void;

let listener: Listener | null = null;

export function showAppDialog(payload: AppDialogPayload) {
  listener?.(payload);
}

export function closeAppDialog() {
  listener?.(null);
}

export function showNotice(title: string, body: string) {
  showAppDialog({
    title,
    body,
    actions: [{ label: "Listo", variant: "primary" }],
  });
}

export function showConfirm(opts: {
  title: string;
  body: string;
  cancelLabel?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  showAppDialog({
    title: opts.title,
    body: opts.body,
    actions: [
      {
        label: opts.confirmLabel,
        variant: opts.danger ? "danger" : "primary",
        onPress: opts.onConfirm,
      },
      { label: opts.cancelLabel ?? "Cancelar", variant: "secondary" },
    ],
  });
}

export function AppDialogHost() {
  const [payload, setPayload] = useState<AppDialogPayload | null>(null);

  useEffect(() => {
    listener = setPayload;
    return () => {
      if (listener === setPayload) listener = null;
    };
  }, []);

  if (!payload) return null;

  const close = () => setPayload(null);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={close}>
      <Pressable style={styles.bg} onPress={close}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.h}>{payload.title}</Text>
          <Text style={styles.p}>{payload.body}</Text>
          <View style={{ gap: space[8], marginTop: space[16] }}>
            {payload.actions.map((a) => (
              <Button
                key={a.label}
                label={a.label}
                variant={a.variant ?? "primary"}
                onPress={() => {
                  close();
                  a.onPress?.();
                }}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: space[20],
  },
  card: {
    backgroundColor: colors.navyDark,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[24],
  },
  h: typeStyle("h3", colors.white),
  p: { ...typeStyle("bodySmall", colors.textSecondary), marginTop: space[8] },
});
