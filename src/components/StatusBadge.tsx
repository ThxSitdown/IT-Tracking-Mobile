import { Text, View, StyleSheet } from "react-native";
import { getStatusMeta } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { JobStatus } from "../api/jobs";

export function StatusBadge({ status }: { status: JobStatus }) {
  const { colors } = useTheme();
  const meta = getStatusMeta(colors)[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

// สไตล์ชุดนี้ไม่มีสีตายตัว (สีมาจาก meta ตามธีม) จึงสร้างครั้งเดียวระดับโมดูลได้
const styles = StyleSheet.create({
  badge: { height: 26, paddingHorizontal: 12, borderRadius: 20, justifyContent: "center" },
  text: { fontSize: 11.5, fontWeight: "700" },
});
