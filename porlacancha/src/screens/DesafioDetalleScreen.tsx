import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@shared/design";
import {
  etiquetaEmpiezaEn,
  etiquetaEstado,
  etiquetaModalidad,
  etiquetaTipo,
  esSoloCancha,
  formatDiaSemana,
  formatFechaCorta,
  formatHora,
  formatPremio,
  formatPremioArriba,
  type Desafio,
} from "../lib/desafios";
import { ChevronLeft, MapPin, Share2, iconStroke } from "../lib/icons";
import { Button, Chip, Mute } from "../ui";
import { EquipoCupos } from "../ui/EquipoCupos";
import { PitchCover } from "../ui/PitchCover";
import { typeStyle } from "../ui/textStyle";

type Props = {
  desafio: Desafio;
  guest: boolean;
  inscriptoComo?: "capitan" | "miembro" | null;
  onBack: () => void;
  onInscribir: () => void;
  onOpenMap: () => void;
};

export function DesafioDetalleScreen({ desafio, guest, inscriptoComo, onBack, onInscribir, onOpenMap }: Props) {
  const insets = useSafeAreaInsets();
  const solo = esSoloCancha(Number(desafio.premio));
  const lugar = desafio.barrio?.trim()
    ? `${desafio.direccion} · ${desafio.barrio}`
    : desafio.direccion;
  const copyVisible =
    desafio.descripcion && !desafio.descripcion.includes("[seed:porlacancha-test]")
      ? desafio.descripcion
      : null;
  const empieza = etiquetaEmpiezaEn(desafio.fecha, desafio.hora_inicio);
  const lat = Number(desafio.lat);
  const lng = Number(desafio.lng);

  const cupoLleno = (desafio.inscritos?.length ?? 0) >= (desafio.cupos || 2);
  const inscribir = () => {
    onInscribir();
  };
  const ctaLabel = guest
    ? "Ingresá para inscribir"
    : inscriptoComo === "capitan"
      ? "Editar convocados"
      : inscriptoComo === "miembro"
        ? "Tu equipo ya está"
        : cupoLleno
          ? "Sin lugar"
          : "Inscribir mi equipo";
  const ctaOff = Boolean(!guest && (inscriptoComo === "miembro" || (!inscriptoComo && cupoLleno)));

  const compartir = () => {
    void Share.share({
      message: `${desafio.titulo} · ${formatPremioArriba(Number(desafio.premio))}`,
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View>
          <PitchCover height={220} variant="flush">
            <View style={[styles.heroNav, { paddingTop: Math.max(insets.top, space[12]) }]}>
              <Pressable onPress={onBack} style={styles.iconBtn} accessibilityRole="button">
                <ChevronLeft color={colors.white} size={22} strokeWidth={iconStroke} />
              </Pressable>
              <Pressable onPress={compartir} style={styles.iconBtn} accessibilityRole="button">
                <Share2 color={colors.white} size={20} strokeWidth={iconStroke} />
              </Pressable>
            </View>
            <View style={styles.heroChips}>
              <Chip
                label={etiquetaEstado(desafio.estado)}
                tone={desafio.estado === "completo" ? "complete" : "open"}
              />
              {empieza ? (
                <View style={styles.cd}>
                  <Text style={styles.cdTxt}>{empieza.replace("Empieza", "Cierra")}</Text>
                </View>
              ) : null}
            </View>
          </PitchCover>
        </View>

        <View style={styles.pad}>
          <View style={styles.hero}>
            <View style={styles.when}>
              <Text style={styles.dia}>{formatDiaSemana(desafio.fecha)}</Text>
              <Text style={styles.hora}>{formatHora(desafio.hora_inicio)}</Text>
              <Text style={styles.fecha}>{formatFechaCorta(desafio.fecha)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mod}>{etiquetaModalidad(Number(desafio.premio))}</Text>
              {solo ? null : <Text style={styles.prize}>{formatPremioArriba(Number(desafio.premio))}</Text>}
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>{etiquetaTipo(desafio.tipo)}</Text>
            <Text style={styles.sep}>|</Text>
            <Text style={styles.meta}>{desafio.duracion_min} min</Text>
          </View>

          <View style={styles.venue}>
            <View style={{ flex: 1, gap: space[8] }}>
              <View style={styles.loc}>
                <MapPin color={colors.sky} size={16} strokeWidth={iconStroke} />
                <Text style={styles.venueTxt}>{lugar}</Text>
              </View>
              <Button label="Ver en mapa" variant="secondary" onPress={onOpenMap} />
            </View>
            {Number.isFinite(lat) && Number.isFinite(lng) ? (
              <MapView
                style={styles.miniMap}
                provider={PROVIDER_GOOGLE}
                pointerEvents="none"
                region={{
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: lat, longitude: lng }} />
              </MapView>
            ) : null}
          </View>

          <Text style={styles.h2}>Equipos</Text>
          <EquipoCupos desafio={desafio} />
          {(desafio.inscritos ?? []).map((eq) => (
            <Text key={eq.id} style={styles.eqName}>
              {eq.nombre}
            </Text>
          ))}
          {(desafio.inscritos?.length ?? 0) < (desafio.cupos || 2) ? (
            <Mute>Buscando rival.</Mute>
          ) : null}

          <Text style={styles.h2}>¿Cómo funciona?</Text>
          <Mute>
            El premio lo pone quien arma el desafío. El capitán inscribe al equipo y marca quiénes
            juegan. En este piloto no hay cobro: la inscripción queda confirmada.
          </Mute>
          {copyVisible ? <Text style={styles.body}>{copyVisible}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: insets.bottom + space[12] }]}>
        <View>
          <Text style={styles.ctaKicker}>{solo ? "Modalidad" : "Premio"}</Text>
          <Text style={styles.ctaPrize}>
            {solo ? "Solo cancha" : formatPremio(Number(desafio.premio))}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={ctaLabel}
            onPress={inscribir}
            disabled={ctaOff}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space[8],
  },
  iconBtn: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  heroChips: {
    position: "absolute",
    left: space[16],
    right: space[16],
    bottom: space[12],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cd: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: space[12],
    paddingVertical: space[4],
    backgroundColor: "rgba(0,27,68,0.55)",
  },
  cdTxt: typeStyle("caption", colors.goldLight),
  pad: { paddingHorizontal: space[16], paddingTop: space[16] },
  hero: { flexDirection: "row", gap: space[16] },
  when: { minWidth: 80 },
  dia: typeStyle("label", colors.white),
  hora: typeStyle("numXL", colors.white),
  fecha: typeStyle("caption", colors.textSecondary),
  mod: typeStyle("bodySmall", colors.white),
  prize: typeStyle("numL", colors.gold),
  metaRow: { flexDirection: "row", alignItems: "center", gap: space[8], marginTop: space[12] },
  meta: typeStyle("caption", colors.textSecondary),
  sep: { color: colors.borderStrong },
  venue: {
    marginTop: space[24],
    flexDirection: "row",
    gap: space[12],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[16],
  },
  loc: { flexDirection: "row", alignItems: "flex-start", gap: space[8] },
  venueTxt: { flex: 1, ...typeStyle("body", colors.white) },
  miniMap: { width: 96, height: 96, borderRadius: radius.md, overflow: "hidden" },
  h2: { ...typeStyle("h3", colors.white), marginTop: space[32], marginBottom: space[8] },
  eqName: { ...typeStyle("body", colors.white), marginTop: space[8] },
  body: { ...typeStyle("body", colors.textSecondary), marginTop: space[12] },
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.navy,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: space[16],
    paddingTop: space[12],
    flexDirection: "row",
    alignItems: "center",
    gap: space[12],
  },
  ctaKicker: typeStyle("caption", colors.textSecondary),
  ctaPrize: typeStyle("numM", colors.gold),
});
