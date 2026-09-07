import { Text, View, StyleSheet } from "react-native";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { GrowBar } from "./Motion";
import { staggerDelay } from "../utils/animation";

type BarDatum = { label: string; count: number };

type Props = {
  title: string;
  data: BarDatum[];
  color?: string;
  emptyText?: string;
};

// แท่งแนวนอน 1 แถวต่อ 1 หมวด ความยาวแปรผันตามสัดส่วนของหมวดที่มากที่สุด — ใช้ซ้ำได้กับข้อมูลหลายมิติ
// (ตอนนี้ใช้กับ "งานตามประเภท" และ "งานตามผู้รับผิดชอบ")
export function HorizontalBarChart({ title, data, color, emptyText = "ยังไม่มีข้อมูล" }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // ค่าเริ่มต้นของสีต้องมาจากธีมปัจจุบัน จึงกำหนดในตัวฟังก์ชัน ไม่ใช่ใน default parameter
  const barColor = color ?? colors.brass;
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {data.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        data.map((d, i) => (
          <View key={d.label} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.track}>
              <GrowBar
                percent={(d.count / maxCount) * 100}
                axis="width"
                delay={staggerDelay(i, 50)}
                style={[styles.fill, { backgroundColor: barColor }]}
              />
            </View>
            <Text style={styles.count}>{d.count}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "#0F1626",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.md },
  empty: { fontSize: 12.5, color: colors.textTertiary },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  label: { width: 100, fontSize: 12, color: colors.textPrimary, fontWeight: "600" },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.slateBg, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  count: { width: 24, fontSize: 12, fontWeight: "700", color: colors.textPrimary, textAlign: "right" },
});
