import { Text, View, StyleSheet } from "react-native";
import { ThemeColors, spacing } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

// เส้นคั่นพร้อมข้อความตรงกลาง (เช่น "หรือ") — ใช้คั่นวิธีเข้าสู่ระบบหลักกับทางเลือกอื่น
export function AuthDivider({ label = "หรือ" }: { label?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  label: { color: "#8890A6", fontSize: 12 },
});
