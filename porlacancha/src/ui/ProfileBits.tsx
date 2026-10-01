import { colors, space } from "@shared/design";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Camera, iconStroke } from "../lib/icons";
import { iniciales } from "../lib/perfil";
import { typeStyle } from "./textStyle";

type AvatarProps = {
  uri?: string | null;
  nombre?: string | null;
  apellido?: string;
  size?: number;
  onCamera?: () => void;
};

export function PlayerAvatar({ uri, nombre, apellido = "", size = 88, onCamera }: AvatarProps) {
  const cam = 32;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, overflow: "hidden", borderRadius: size / 2 }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderWidth: 2, borderColor: colors.white }} />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderWidth: 2,
              borderColor: colors.white,
              backgroundColor: colors.surfaceElevated,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: size / 2,
            }}
          >
            <Text style={typeStyle("h2", colors.white)}>{iniciales(nombre ?? null, apellido)}</Text>
          </View>
        )}
      </View>
      {onCamera ? (
        <Pressable
          onPress={onCamera}
          accessibilityLabel="Cambiar foto de perfil"
          style={[
            styles.cam,
            {
              width: cam,
              height: cam,
              borderRadius: cam / 2,
              right: 0,
              bottom: 0,
            },
          ]}
        >
          <Camera color={colors.white} size={16} strokeWidth={iconStroke} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sec}>
      <Text style={styles.secT}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.secA}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function KvRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.kv, !last && styles.kvLine]}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value || "—"}</Text>
    </View>
  );
}

export function IconBtn({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.iconBtn}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cam: {
    position: "absolute",
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sec: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: space[12],
    marginTop: space[24],
  },
  secT: typeStyle("h3", colors.white),
  secA: typeStyle("bodySmall", colors.sky),
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space[12],
    paddingVertical: space[12],
    minHeight: 48,
    alignItems: "center",
  },
  kvLine: { borderBottomWidth: 1, borderBottomColor: colors.border },
  k: { ...typeStyle("bodySmall", colors.textSecondary), flex: 1 },
  v: { ...typeStyle("bodySmall", colors.white), flex: 1, textAlign: "right" },
  iconBtn: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
});
