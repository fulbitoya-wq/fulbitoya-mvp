import { colors, space } from "@shared/design";
import { StyleSheet, Text } from "react-native";
import { typeStyle } from "./textStyle";

export function Heading({ children }: { children: string }) {
  return <Text style={styles.h}>{children}</Text>;
}

export function Lead({ children }: { children: string }) {
  return <Text style={styles.lead}>{children}</Text>;
}

export function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Mute({ children }: { children: string }) {
  return <Text style={styles.mute}>{children}</Text>;
}

export function ErrorText({ children }: { children: string }) {
  return <Text style={styles.err}>{children}</Text>;
}

export function InfoText({ children }: { children: string }) {
  return <Text style={styles.info}>{children}</Text>;
}

const styles = StyleSheet.create({
  h: { ...typeStyle("h1", colors.white), marginTop: space[8] },
  lead: { ...typeStyle("body", colors.textSecondary), marginTop: space[8], marginBottom: space[20] },
  kicker: {
    ...typeStyle("label", colors.gold),
    textTransform: "uppercase",
  },
  mute: typeStyle("bodySmall", colors.textSecondary),
  err: { ...typeStyle("bodySmall", colors.danger), marginBottom: space[12], fontWeight: "700" },
  info: { ...typeStyle("bodySmall", colors.success), marginBottom: space[12] },
});
