import { colors, space } from "@shared/design";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { typeStyle } from "./textStyle";

type Props = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: Props) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: space[24],
    gap: space[8],
  },
  title: typeStyle("h3", colors.white),
  body: typeStyle("bodySmall", colors.textSecondary),
});
