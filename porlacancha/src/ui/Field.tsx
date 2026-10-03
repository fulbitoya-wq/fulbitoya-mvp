import { colors, radius, space } from "@shared/design";
import { useState } from "react";
import type { TextInputProps } from "react-native";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Lock, Mail, User, iconStroke } from "../lib/icons";
import { fontFamily } from "../lib/fonts";
import { typeStyle } from "./textStyle";

type LeftIcon = "mail" | "lock" | "user";

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  invalid?: boolean;
  leftIcon?: LeftIcon;
};

const iconColor = "rgba(139,201,235,0.80)";

function Icon({ name }: { name: LeftIcon }) {
  const props = { color: iconColor, size: 20, strokeWidth: iconStroke };
  if (name === "mail") return <Mail {...props} />;
  if (name === "lock") return <Lock {...props} />;
  return <User {...props} />;
}

export function Field({
  label,
  error,
  invalid,
  leftIcon,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPass = Boolean(secureTextEntry);
  const showErr = Boolean(error || invalid);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          focused && !showErr ? styles.boxFocus : null,
          showErr ? styles.boxErr : null,
        ]}
      >
        {leftIcon ? (
          <View style={styles.icon}>
            <Icon name={leftIcon} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor="rgba(184,196,214,0.75)"
          style={[styles.input, style]}
          secureTextEntry={isPass ? hidden : false}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isPass ? (
          <Pressable
            onPress={() => setHidden((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Ver contraseña" : "Ocultar contraseña"}
            style={styles.iconRight}
          >
            <Text style={styles.toggleTxt}>{hidden ? "Ver" : "Ocultar"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space[12] },
  label: {
    ...typeStyle("label", colors.sky),
    textTransform: "uppercase",
    marginBottom: space[8],
  },
  box: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,27,68,0.72)",
    borderWidth: 1,
    borderColor: "rgba(139,201,235,0.28)",
    borderRadius: radius.md,
    paddingLeft: 16,
    paddingRight: 8,
  },
  boxFocus: {
    borderWidth: 1.5,
    borderColor: "rgba(139,201,235,0.78)",
    shadowColor: colors.sky,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  boxErr: {
    borderColor: colors.danger,
    borderWidth: 1,
  },
  icon: { marginRight: 10 },
  iconRight: { paddingHorizontal: 10, paddingVertical: 8 },
  toggleTxt: {
    color: colors.sky,
    fontFamily: fontFamily.uiSemibold,
    fontSize: 13,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 14,
    paddingRight: 8,
    color: colors.white,
    fontFamily: fontFamily.ui,
    fontSize: 16,
  },
  err: {
    marginTop: space[8],
    color: colors.danger,
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
});
