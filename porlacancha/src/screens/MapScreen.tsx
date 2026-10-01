import { useMemo } from "react";
import { colors, radius, space } from "@shared/design";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { formatPremioCorto, type Desafio } from "../lib/desafios";
import { X, iconStroke } from "../lib/icons";
import { DesafioCard } from "../ui";

const BA = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

type MapScreenProps = {
  items: Desafio[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear?: () => void;
  onOpenDesafio?: (d: Desafio) => void;
};

export function MapScreen({
  items,
  loading,
  error,
  selectedId,
  onSelect,
  onClear,
  onOpenDesafio,
}: MapScreenProps) {
  const selected = useMemo(
    () => items.find((d) => d.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    <View style={styles.root}>
      <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} initialRegion={BA}>
        {items.map((d) => {
          const active = d.id === selectedId;
          return (
            <Marker
              key={d.id}
              coordinate={{ latitude: Number(d.lat), longitude: Number(d.lng) }}
              onPress={() => onSelect(d.id)}
              tracksViewChanges={false}
            >
              <View style={[styles.pin, active && styles.pinActive]}>
                <Text style={[styles.pinText, active && styles.pinTextActive]}>
                  {formatPremioCorto(Number(d.premio))}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.sheet}>
        {loading ? (
          <ActivityIndicator color={colors.gold} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !selected ? (
          <Text style={styles.muted}>Tocá un pin para ver el desafío.</Text>
        ) : (
          <View>
            {onClear ? (
              <Pressable onPress={onClear} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
                <X color={colors.textSecondary} size={18} strokeWidth={iconStroke} />
              </Pressable>
            ) : null}
            <DesafioCard
              compact
              desafio={selected}
              onPress={() => (onOpenDesafio ? onOpenDesafio(selected) : onSelect(selected.id))}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  sheet: {
    position: "absolute",
    left: space[16],
    right: space[16],
    bottom: space[12],
  },
  close: {
    position: "absolute",
    right: space[8],
    top: space[8],
    zIndex: 4,
    minWidth: 48,
    minHeight: 48,
    alignItems: "flex-end",
  },
  muted: {
    fontSize: 14,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
  },
  error: { fontSize: 13, color: colors.danger },
  pin: {
    backgroundColor: colors.sky,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pinActive: { backgroundColor: colors.gold },
  pinText: { fontSize: 12, fontWeight: "800", color: colors.navyDark },
  pinTextActive: { color: colors.navyDark },
});
