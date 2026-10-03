import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, gradientRn } from "@shared/design";
import { Bell, iconStroke } from "../lib/icons";

type Props = {
  unread: number;
  onPress: () => void;
};

export function NotifBell({ unread, onPress }: Props) {
  const badge = unread > 9 ? "9+" : String(unread);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Notificaciones" style={styles.btn}>
      <LinearGradient colors={[...gradientRn.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.disc}>
        <Bell color={colors.white} fill={colors.white} size={18} strokeWidth={iconStroke} />
      </LinearGradient>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeT}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  disc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeT: { color: colors.white, fontSize: 10, fontWeight: "800", lineHeight: 12 },
});
