import { useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, gradientRn, radius, space } from "@shared/design";
import { esFinde, esHoy, esManana, esSoloCancha, type Desafio } from "../lib/desafios";
import { BrandLogo, DesafioCard, EmptyState, FilterChip, HeaderDecor, Mute, NotifBell } from "../ui";
import { typeStyle } from "../ui/textStyle";
import { MapScreen } from "./MapScreen";

type WhenFilter = "todos" | "hoy" | "manana" | "finde";
type TipoFilter = "todos" | "f5" | "f7" | "f9" | "f11";
type ModoFilter = "todos" | "premio" | "cancha";

type Props = {
  items: Desafio[];
  loading: boolean;
  error: string | null;
  guest?: boolean;
  selectedId: string | null;
  preferMap?: boolean;
  onSelectId: (id: string | null) => void;
  onOpenDesafio: (d: Desafio) => void;
  unreadNotifs?: number;
  onOpenNotifs?: () => void;
};

export function ExplorarScreen({
  items,
  loading,
  error,
  guest,
  selectedId,
  preferMap,
  onSelectId,
  onOpenDesafio,
  unreadNotifs = 0,
  onOpenNotifs,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"lista" | "mapa">(preferMap ? "mapa" : "lista");

  useEffect(() => {
    if (preferMap) setMode("mapa");
  }, [preferMap]);
  const [when, setWhen] = useState<WhenFilter>("todos");
  const [tipo, setTipo] = useState<TipoFilter>("todos");
  const [modo, setModo] = useState<ModoFilter>("todos");
  const [hayLugar, setHayLugar] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (when === "hoy" && !esHoy(d.fecha)) return false;
      if (when === "manana" && !esManana(d.fecha)) return false;
      if (when === "finde" && !esFinde(d.fecha)) return false;
      if (tipo !== "todos" && d.tipo !== tipo) return false;
      if (modo === "premio" && esSoloCancha(Number(d.premio))) return false;
      if (modo === "cancha" && !esSoloCancha(Number(d.premio))) return false;
      if (hayLugar && (d.inscritos?.length ?? 0) >= (d.cupos || 2)) return false;
      return true;
    });
  }, [items, when, tipo, modo, hayLugar]);

  const header = (
    <LinearGradient colors={[...gradientRn.hero]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: Math.max(insets.top, space[16]) }]}>
      <HeaderDecor />
      <View style={styles.brandRow}>
        <View style={styles.brandSide} />
        <BrandLogo size="sm" />
        {onOpenNotifs ? (
          <NotifBell unread={unreadNotifs} onPress={onOpenNotifs} />
        ) : (
          <View style={styles.brandSide} />
        )}
      </View>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setMode("lista")}
          style={[styles.segBtn, mode === "lista" && styles.segOn]}
        >
          <Text style={[styles.segTxt, mode === "lista" && styles.segTxtOn]}>Lista</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("mapa")}
          style={[styles.segBtn, mode === "mapa" && styles.segOn]}
        >
          <Text style={[styles.segTxt, mode === "mapa" && styles.segTxtOn]}>Mapa</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <FilterChip label="Hoy" selected={when === "hoy"} onPress={() => setWhen((v) => (v === "hoy" ? "todos" : "hoy"))} />
        <FilterChip
          label="Mañana"
          selected={when === "manana"}
          onPress={() => setWhen((v) => (v === "manana" ? "todos" : "manana"))}
        />
        <FilterChip
          label="Finde"
          selected={when === "finde"}
          onPress={() => setWhen((v) => (v === "finde" ? "todos" : "finde"))}
        />
        {(["f5", "f7", "f9", "f11"] as const).map((t) => (
          <FilterChip
            key={t}
            label={t.toUpperCase()}
            selected={tipo === t}
            onPress={() => setTipo((v) => (v === t ? "todos" : t))}
          />
        ))}
        <FilterChip
          label="Hay lugar"
          selected={hayLugar}
          onPress={() => setHayLugar((v) => !v)}
        />
        <FilterChip
          label="Con premio"
          selected={modo === "premio"}
          onPress={() => setModo((v) => (v === "premio" ? "todos" : "premio"))}
        />
        <FilterChip
          label="Solo cancha"
          selected={modo === "cancha"}
          onPress={() => setModo((v) => (v === "cancha" ? "todos" : "cancha"))}
        />
      </ScrollView>
      {guest ? <Mute>Mirá sin cuenta. El capitán inscribe al equipo.</Mute> : null}
    </LinearGradient>
  );

  if (mode === "mapa") {
    return (
      <View style={styles.fill}>
        {header}
        <MapScreen
          items={filtered}
          loading={loading}
          error={error}
          selectedId={selectedId}
          onSelect={onSelectId}
          onClear={() => onSelectId(null)}
          onOpenDesafio={onOpenDesafio}
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      {header}
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {loading ? (
          <Mute>Cargando desafíos…</Mute>
        ) : error ? (
          <Text style={typeStyle("bodySmall", colors.danger)}>{error}</Text>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No hay desafíos con esos filtros"
            body="Probá Hoy, Mañana o el formato, o pasá a mapa."
          />
        ) : (
          filtered.map((d) => <DesafioCard key={d.id} desafio={d} onPress={() => onOpenDesafio(d)} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.navy },
  header: {
    paddingHorizontal: space[16],
    paddingBottom: space[12],
    gap: space[16],
    overflow: "hidden",
    minHeight: 118,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 88,
  },
  brandSide: { width: 48, minHeight: 48 },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.navyDark,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    minHeight: 40,
  },
  segBtn: {
    flex: 1,
    minHeight: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segOn: { backgroundColor: colors.sky },
  segTxt: typeStyle("caption", colors.gold),
  segTxtOn: { color: colors.navyDark, fontWeight: "700" },
  filters: { flexDirection: "row", alignItems: "center", gap: space[8], paddingRight: space[8] },
  list: { paddingHorizontal: space[16], paddingBottom: space[40], paddingTop: space[12] },
});
