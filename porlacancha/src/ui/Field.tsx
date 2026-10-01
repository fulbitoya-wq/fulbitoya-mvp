import { colors, radius, space } from "@shared/design";
import type { TextInputProps } from "react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { fontFamily } from "../lib/fonts";
import { typeStyle } from "./textStyle";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function Field({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, error ? styles.inputErr : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space[12] },
  label: {
    ...typeStyle("label", colors.gold),
    textTransform: "uppercase",
    marginBottom: space[8],
  },
  input: {
    minHeight: 48,
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    paddingHorizontal: space[16],
    paddingVertical: space[12],
    color: colors.white,
    fontFamily: fontFamily.ui,
    fontSize: 16,
  },
  inputErr: { borderColor: colors.danger },
  err: { ...typeStyle("caption", colors.danger), marginTop: space[8] },
});
