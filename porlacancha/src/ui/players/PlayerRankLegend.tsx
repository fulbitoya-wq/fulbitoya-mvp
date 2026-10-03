import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { PLAYER_RANKS, type PlayerRange } from "../../lib/player-ranks";
import { typeStyle } from "../textStyle";
import { PlayerRankShield } from "./PlayerRankShield";

const ORDER: PlayerRange[] = ["bronze", "silver", "gold", "elite", "new"];

const SAMPLES: { range: Exclude<PlayerRange, "new">; name: string; level: number; photo: string }[] = [
  {
    range: "bronze",
    name: "Bronce",
    level: 42,
    photo: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=240&h=280&fit=crop",
  },
  {
    range: "silver",
    name: "Plata",
    level: 68,
    photo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=240&h=280&fit=crop",
  },
  {
    range: "gold",
    name: "Oro",
    level: 81,
    photo: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=240&h=280&fit=crop",
  },
  {
    range: "elite",
    name: "Élite",
    level: 94,
    photo: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=240&h=280&fit=crop",
  },
];

export function PlayerRankLegend() {
  return (
    <View style={styles.box}>
      <Text style={styles.h}>Cómo se va a ver el rango</Text>
      <Text style={styles.lead}>
        Hoy todos los jugadores reales figuran como nuevos. Estos escudos son solo de muestra.
      </Text>
      <View style={styles.samples}>
        {SAMPLES.map((s) => (
          <View key={s.range} style={styles.sample}>
            <PlayerRankShield
              name={s.name}
              avatarUrl={s.photo}
              level={s.level}
              range={s.range}
            />
          </View>
        ))}
      </View>
      <Text style={styles.h}>Rangos</Text>
      {ORDER.map((key) => {
        const r = PLAYER_RANKS[key];
        return (
          <View key={key} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: r.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{r.legendTitle}</Text>
              <Text style={styles.body}>{r.legendBody}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space[12] },
  h: typeStyle("h3", colors.white),
  lead: typeStyle("caption", colors.textSecondary),
  samples: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: space[16],
    paddingVertical: space[8],
  },
  sample: { width: "48%", alignItems: "center" },
  row: { flexDirection: "row", gap: space[12], alignItems: "flex-start" },
  swatch: {
    width: 12,
    height: 36,
    borderRadius: radius.sm,
  },
  title: typeStyle("bodySmall", colors.white),
  body: typeStyle("caption", colors.textSecondary),
});
