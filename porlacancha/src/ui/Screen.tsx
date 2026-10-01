import { colors, space } from "@shared/design";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll }: Props) {
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: Math.max(insets.top, space[24]),
    paddingBottom: insets.bottom + space[16],
    paddingHorizontal: space[20],
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, pad]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, pad]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />
      {body}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  flex: { flex: 1, backgroundColor: colors.navy },
  content: { paddingBottom: space[40] },
});
