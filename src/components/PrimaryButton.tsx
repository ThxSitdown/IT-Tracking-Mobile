import { ActivityIndicator, Text, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, radius } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { PressableScale } from "./Motion";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * danger = การกระทำที่ย้อนกลับไม่ได้/ต้องระวัง (ออกจากระบบ, ลบ) — พื้นแดงอ่อน ตัวอักษรแดง
   * gold = ปุ่มหลักบนหน้า auth พื้นเข้ม — ไล่เฉดทองพร้อมเงาเรือง
   * outlineDark = ปุ่มรองบนพื้นเข้ม (โปร่ง ขอบจาง ตัวอักษรขาว)
   */
  variant?: "brass" | "blue" | "ghost" | "danger" | "gold" | "outlineDark";
  /** ไอคอน Ionicons ที่จะโชว์หน้าข้อความ (ไม่ใส่ก็ได้) */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
};

export function PrimaryButton({ title, onPress, loading, disabled, variant = "brass", icon, style }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";
  const isGold = variant === "gold";
  const isOutlineDark = variant === "outlineDark";

  const contentColor = isGold
    ? "#3A2C05" // ตัวอักษรเข้มบนพื้นทอง อ่านง่ายกว่าสีขาว
    : isDanger
      ? colors.red
      : isGhost
        ? colors.textPrimary
        : "#fff";

  const inner = loading ? (
    <ActivityIndicator color={contentColor} />
  ) : (
    <View style={styles.content}>
      {icon && <Ionicons name={icon} size={17} color={contentColor} />}
      <Text style={[styles.text, { color: contentColor }]}>{title}</Text>
    </View>
  );

  // ปุ่มทองต้องห่อด้วย LinearGradient — ใส่ gradient ผ่าน style ธรรมดาไม่ได้
  if (isGold) {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.goldGlow, (disabled || loading) && { opacity: 0.6 }, style]}
      >
        <LinearGradient
          colors={["#F2D89B", "#D8A63A", "#C9972B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          {inner}
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variant === "brass" && { backgroundColor: colors.brass },
        variant === "blue" && { backgroundColor: colors.signalBlue },
        isGhost && { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border },
        isDanger && { backgroundColor: colors.redBg },
        isOutlineDark && {
          backgroundColor: "rgba(255,255,255,0.04)",
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.15)",
        },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {inner}
    </PressableScale>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  // เงาต้องอยู่ที่ตัวห่อชั้นนอก ไม่ใช่บน LinearGradient เอง (ไม่งั้นถูก overflow ของ gradient ตัดทิ้ง)
  goldGlow: {
    borderRadius: radius.md,
    shadowColor: "#C9972B",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontWeight: "700", fontSize: 15 },
});
