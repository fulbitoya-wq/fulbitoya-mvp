import { View } from "react-native";
import { colors } from "@shared/design";
import { ChevronLeft, iconStroke } from "../../lib/icons";
import { IconBtn } from "../../ui";

export function AuthBackBar({ onBack, label = "Volver" }: { onBack: () => void; label?: string }) {
  return (
    <View style={{ marginLeft: -12, marginBottom: 4, alignSelf: "flex-start" }}>
      <IconBtn onPress={onBack} label={label}>
        <ChevronLeft color={colors.sky} size={22} strokeWidth={iconStroke} />
      </IconBtn>
    </View>
  );
}
