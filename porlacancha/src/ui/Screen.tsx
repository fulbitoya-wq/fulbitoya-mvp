import { colors, space } from "@shared/design";
import type { ReactNode } from "react";
import {
  ImageBackground,
  type ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_CONTENT_INSET } from "./PorLaCanchaBottomTabBar";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  background?: ImageSourcePropType;
  tabBar?: boolean;
};

export function Screen({ children, scroll, background, tabBar }: Props) {
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: Math.max(insets.top, space[24]),
    paddingBottom: insets.bottom + space[16] + (tabBar ? TAB_BAR_CONTENT_INSET : 0),
    paddingHorizontal: space[20],
  };
  const clear = Boolean(background);

  const body = scroll ? (
    <ScrollView
      style={[styles.flex, clear && styles.clear]}
      contentContainerStyle={[styles.content, pad]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, clear && styles.clear, pad]}>{children}</View>
  );

  const page = (
    <KeyboardAvoidingView
      style={[styles.page, clear && styles.clear]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" />
      {body}
    </KeyboardAvoidingView>
  );

  if (!background) return page;

  return (
    <ImageBackground source={background} style={styles.page} resizeMode="cover">
      {page}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.navy },
  flex: { flex: 1, backgroundColor: colors.navy },
  clear: { backgroundColor: "transparent" },
  content: { paddingBottom: space[40] },
});
