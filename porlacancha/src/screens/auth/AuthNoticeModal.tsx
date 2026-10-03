import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@shared/design";
import { Button } from "../../ui";
import { typeStyle } from "../../ui/textStyle";

type Props = {
  visible: boolean;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function AuthNoticeModal({
  visible,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onPrimary}>
      <Pressable style={styles.bg} onPress={onPrimary}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.h}>{title}</Text>
          <Text style={styles.p}>{body}</Text>
          <View style={{ gap: space[8], marginTop: space[16] }}>
            <Button label={primaryLabel} onPress={onPrimary} />
            {secondaryLabel && onSecondary ? (
              <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: space[20],
  },
  card: {
    backgroundColor: colors.navyDark,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[24],
  },
  h: typeStyle("h3", colors.white),
  p: { ...typeStyle("bodySmall", colors.textSecondary), marginTop: space[8] },
});
