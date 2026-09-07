import { useCallback, useState } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompositeScreenProps, useFocusEffect } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { DashboardSummary, getDashboard, jobsCsvUrl } from "../api/jobs";
import { RangeKey, rangeToDates } from "../utils/dateRange";
import { downloadCsv } from "../utils/downloadCsv";
import { showDialog } from "../utils/dialog";
import { useAuthStore } from "../store/authStore";
import { HorizontalBarChart } from "../components/HorizontalBarChart";
import { DonutChart } from "../components/DonutChart";
import { ErrorState } from "../components/ErrorState";
import { CountUpText, FadeInView, GrowBar } from "../components/Motion";
import { staggerDelay } from "../utils/animation";
import { ApiError } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ReportsTab">,
  NativeStackScreenProps<RootStackParamList>
>;

const WEEKDAY_SHORT_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// ตัวเลือกช่วงเวลา — คำนวณวันที่ตอนกดจริง (ไม่ fix ไว้ตอน import) เพื่อให้ "7 วันล่าสุด" ขยับตามวันที่ปัจจุบันเสมอ

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "7d", label: "7 วัน" },
  { key: "30d", label: "30 วัน" },
  { key: "month", label: "เดือนนี้" },
];

// กราฟส่วนใหญ่ในหน้านี้วาดด้วย View ธรรมดา ส่วนวงกลมสัดส่วนสถานะใช้ react-native-svg (DonutChart)
export function ReportsScreen(_props: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [exporting, setExporting] = useState(false);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const { isDesktop } = useResponsive();

  async function load() {
    if (!activeHotelId) return;
    const data = await getDashboard(activeHotelId, rangeToDates(range));
    setSummary(data);
  }

  function reload() {
    setLoading(true);
    setError(null);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : null))
      .finally(() => setLoading(false));
  }

  useFocusEffect(useCallback(reload, [activeHotelId, range]));

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    await load().catch((err) => setError(err instanceof ApiError ? err.message : null));
    setRefreshing(false);
  }

  async function handleExport() {
    if (!activeHotelId) return;
    setExporting(true);
    try {
      const dates = rangeToDates(range);
      await downloadCsv(
        jobsCsvUrl(activeHotelId, dates),
        `it-tracking-jobs-${dates?.from ?? "all"}.csv`
      );
    } catch (err) {
      showDialog("ส่งออกไม่สำเร็จ", err instanceof Error ? err.message : "ลองใหม่อีกครั้ง");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.titleRow, isDesktop && styles.titleDesktop]}>
        <Text style={styles.title}>รายงาน</Text>
        <Pressable onPress={handleExport} disabled={exporting} style={styles.exportBtn}>
          <Ionicons name={exporting ? "hourglass-outline" : "download-outline"} size={15} color={colors.signalBlue} />
          <Text style={styles.exportText}>{exporting ? "กำลังส่งออก..." : "ส่งออก CSV"}</Text>
        </Pressable>
      </View>

      <View style={[styles.rangeRow, isDesktop && styles.titleDesktop]}>
        {RANGE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setRange(opt.key)}
            style={[styles.rangeChip, range === opt.key && styles.rangeChipActive]}
          >
            <Text style={[styles.rangeChipText, range === opt.key && styles.rangeChipTextActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.signalBlue} />
      ) : error || !summary ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.grid}>
            <StatCard label="งานทั้งหมด" value={summary.total} color={colors.signalBlue} wide={isDesktop} delay={0} />
            <StatCard label="กำลังดำเนินการ" value={summary.onProcess} color={colors.amber} wide={isDesktop} delay={60} />
            <StatCard label="เสร็จสิ้น" value={summary.done} color={colors.green} wide={isDesktop} delay={120} />
            <StatCard label="ยกเลิก" value={summary.cancelled} color={colors.slate} wide={isDesktop} delay={180} />
          </View>

          <View style={isDesktop && styles.chartRow}>
            <View style={isDesktop && styles.chartCol}>
              <StatusBreakdownChart summary={summary} />
            </View>
            <View style={isDesktop && styles.chartCol}>
              <TrendChart data={summary.last7Days} />
            </View>
          </View>
          <View style={isDesktop && styles.chartRow}>
            <View style={isDesktop && styles.chartCol}>
              <HorizontalBarChart
                title="งานตามประเภท"
                data={summary.byTaskType.map((d) => ({ label: d.taskType, count: d.count }))}
                color={colors.brass}
              />
            </View>
            <View style={isDesktop && styles.chartCol}>
              <HorizontalBarChart
                title="งานตามผู้รับผิดชอบ"
                data={summary.byAssignee.map((d) => ({ label: d.name, count: d.count }))}
                color={colors.signalBlue}
              />
            </View>
          </View>

          <Text style={styles.note}>
            ไฟล์ CSV จะรวมใบงานทั้งหมดในช่วงเวลาที่เลือก พร้อมสถานะ ผู้รับผิดชอบ และจำนวนบันทึก/เช็คลิสต์
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  color,
  wide,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  wide?: boolean;
  delay?: number;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <FadeInView delay={delay} style={[styles.card, wide && styles.cardWide]}>
      <CountUpText value={value} style={[styles.cardValue, { color }]} />
      <Text style={styles.cardLabel}>{label}</Text>
    </FadeInView>
  );
}

// แผนภาพวงกลม (โดนัท) แบ่งสัดส่วนตามสถานะ (Done/On Process/Cancelled) พร้อมตัวเลขรวมตรงกลาง
function StatusBreakdownChart({ summary }: { summary: DashboardSummary }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const total = summary.done + summary.onProcess + summary.cancelled;
  const segments = [
    { label: "เสร็จสิ้น", value: summary.done, color: colors.green },
    { label: "กำลังดำเนินการ", value: summary.onProcess, color: colors.amber },
    { label: "ยกเลิก", value: summary.cancelled, color: colors.slate },
  ];

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>สัดส่วนตามสถานะ</Text>
      {total === 0 ? (
        <Text style={styles.emptyChart}>ยังไม่มีข้อมูลงาน</Text>
      ) : (
        <View style={styles.donutRow}>
          <DonutChart data={segments} size={140} thickness={24} centerLabel="งานทั้งหมด" />
          <View style={styles.donutLegend}>
            {segments.map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                <Text style={styles.legendText}>
                  {s.label} · {s.value} ({total ? Math.round((s.value / total) * 100) : 0}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// แท่งแนวตั้งรายวัน 7 วันล่าสุด — ให้เห็นแนวโน้มปริมาณงานที่เข้ามาตามเวลา ต่างมิติจากกราฟตามประเภท/ผู้รับผิดชอบ
function TrendChart({ data }: { data: DashboardSummary["last7Days"] }) {
  const styles = useThemedStyles(createStyles);
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>แนวโน้มงานใหม่ 7 วันล่าสุด</Text>
      <View style={styles.trendRow}>
        {data.map((d, i) => {
          const date = new Date(d.date + "T00:00:00");
          const heightPct = (d.count / maxCount) * 100;
          return (
            <View key={d.date} style={styles.trendCol}>
              <Text style={styles.trendCount}>{d.count > 0 ? d.count : ""}</Text>
              <View style={styles.trendTrack}>
                <GrowBar
                  percent={Math.max(heightPct, d.count > 0 ? 8 : 0)}
                  axis="height"
                  delay={staggerDelay(i, 55)}
                  style={styles.trendFill}
                />
              </View>
              <Text style={styles.trendDay}>{WEEKDAY_SHORT_TH[date.getDay()]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cloud },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  titleDesktop: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingHorizontal: spacing.xxxl },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportText: { fontSize: 12.5, fontWeight: "700", color: colors.signalBlue },
  rangeRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexWrap: "wrap" },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rangeChipActive: { backgroundColor: colors.navyInk, borderColor: colors.navyInk },
  rangeChipText: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  rangeChipTextActive: { color: "#fff" },
  content: { padding: spacing.lg },
  contentDesktop: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingHorizontal: spacing.xxxl },
  chartRow: { flexDirection: "row", gap: spacing.md },
  chartCol: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  card: {
    width: "47%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    shadowColor: "#0F1626",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardWide: { width: "23%" },
  cardValue: { fontSize: 24, fontWeight: "800" },
  cardLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  chartCard: {
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
  chartTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.md },
  emptyChart: { fontSize: 12.5, color: colors.textTertiary },
  donutRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, flexWrap: "wrap" },
  donutLegend: { gap: 10, flex: 1, minWidth: 150 },
  legendRow: { marginTop: spacing.md, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 12.5, color: colors.textSecondary },
  trendRow: { flexDirection: "row", justifyContent: "space-between", height: 120, alignItems: "flex-end" },
  trendCol: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  trendCount: { fontSize: 10.5, fontWeight: "700", color: colors.textSecondary, marginBottom: 2 },
  trendTrack: { width: 18, flex: 1, justifyContent: "flex-end" },
  trendFill: { width: "100%", backgroundColor: colors.signalBlue, borderRadius: 5, minHeight: 2 },
  trendDay: { fontSize: 10.5, color: colors.textTertiary, marginTop: 6 },
  note: { fontSize: 12, color: colors.textTertiary, marginTop: spacing.sm, lineHeight: 18 },
});
