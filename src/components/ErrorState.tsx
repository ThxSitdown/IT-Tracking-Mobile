import { Text, View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";

type Props = {
  message?: string;
  onRetry: () => void;
};

// สถานะ "โหลดข้อมูลไม่สำเร็จ" แบบใช้ซ้ำได้ทุกหน้า — สำคัญตรงที่ต้องแยกให้ชัดจาก "ไม่มีข้อมูล"
// ไม่งั้นเวลาต่อ API/ฐานข้อมูลไม่ติด ผู้ใช้จะเห็นแค่ "ไม่พบงาน" แล้วเข้าใจผิดว่าข้อมูลหายจริง
export function ErrorState({ message, onRetry }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
      <Text style={styles.title}>โหลดข้อมูลไม่สำเร็จ</Text>
      <Text style={styles.message}>{message ?? "ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง"}</Text>
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <Ionicons name="refresh" size={15} color={colors.signalBlue} />
        <Text style={styles.retryText}>ลองใหม่</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 50, paddingHorizontal: spacing.xl, gap: 8 },
  title: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, marginTop: 4 },
  message: { fontSize: 12.5, color: colors.textTertiary, textAlign: "center", lineHeight: 19 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  retryText: { fontSize: 13, fontWeight: "700", color: colors.signalBlue },
});
