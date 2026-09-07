import { TextInput, View, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";

type Props = TextInputProps & {
  dark?: boolean;
  /** ความสูงของกล่อง — ใช้ตอน multiline เท่านั้น (ค่าเริ่มต้น 90) ช่องปกติบรรทัดเดียวสูงคงที่ 54 เสมอ */
  height?: number;
  /** ไอคอนนำหน้าช่องกรอก (เช่น ซองจดหมายหน้าช่องอีเมล, กุญแจหน้าช่องรหัสผ่าน) */
  icon?: keyof typeof Ionicons.glyphMap;
};

// จุดสำคัญของ component นี้: เมื่อ multiline=true ต้องปล่อยให้ "กรอบนอก" (View) ขยายตามความสูงที่กำหนด
// ไปด้วย ไม่ใช่ปรับแค่ตัว TextInput ข้างใน — ไม่งั้นข้อความจะล้นออกนอกกรอบให้เห็นเหมือนที่เคยเกิดบั๊ก
export function InputField({ dark, style, multiline, height, icon, ...props }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={[
        styles.wrap,
        dark && styles.wrapDark,
        icon && styles.wrapWithIcon,
        multiline && { height: height ?? 90, alignItems: "flex-start", paddingVertical: spacing.md },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={dark ? "#8890A6" : colors.textTertiary}
          style={styles.icon}
        />
      )}
      <TextInput
        placeholderTextColor={dark ? "#8890A6" : colors.textTertiary}
        multiline={multiline}
        style={[
          styles.input,
          dark && { color: "#fff" },
          // มีไอคอนแล้วต้องให้ช่องพิมพ์ยืดเต็มพื้นที่ที่เหลือ ไม่งั้นจะกว้างเกินกรอบเพราะ width: "100%" เดิม
          icon ? { flex: 1, width: undefined } : null,
          multiline && { flex: 1, textAlignVertical: "top" },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    height: 54,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  wrapDark: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  wrapWithIcon: { flexDirection: "row", alignItems: "center" },
  icon: { marginRight: 10 },
  input: { fontSize: 15, color: colors.textPrimary, width: "100%" },
});
