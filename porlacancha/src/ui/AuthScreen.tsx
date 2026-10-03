import { colors, space } from "@shared/design";
import type { ReactNode } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const fondoLogin = require("../../assets/fondo-login.jpeg");

type Props = {
  children: ReactNode;
};

export function AuthScreen({ children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={fondoLogin} style={styles.bg} resizeMode="cover">
      <View style={styles.dim}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StatusBar barStyle="light-content" />
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              {
                paddingTop: Math.max(insets.top, space[24]),
                paddingBottom: insets.bottom + space[24],
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.navyDark },
  dim: { flex: 1, backgroundColor: "rgba(0,27,68,0.42)" },
  flex: { flex: 1 },
  content: { paddingHorizontal: space[20], paddingBottom: space[40] },
});
