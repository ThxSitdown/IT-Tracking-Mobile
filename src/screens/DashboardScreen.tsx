import { useCallback, useState } from "react";
import { Text, View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { DashboardSummary, getDashboard } from "../api/jobs";
import { listNotifications } from "../api/notifications";
import { TicketCard } from "../components/TicketCard";
import { CountUpText, FadeInView } from "../components/Motion";
import { staggerDelay } from "../utils/animation";
import { ErrorState } from "../components/ErrorState";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useResponsive } from "../hooks/useResponsive";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "DashboardTab">,
  NativeStackScreenProps<RootStackParamList>
>;

// หมายเหตุ: หน้านี้จะถูก mount ก็ต่อเมื่อ activeHotelId มีค่าแล้วเท่านั้น (ควบคุมโดย RootNavigator)
// จึงไม่ต้องมี defensive check/redirect ซ้ำในนี้อีก — ลดจุดที่ต้องดูแลลงไปหนึ่งจุด
export function DashboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const user = useAuthStore((s) => s.user);
  const { isDesktop } = useResponsive();

  async function load() {
    const data = await getDashboard(activeHotelId);
    setSummary(data);
    // จำนวนที่ยังไม่อ่าน ใช้โชว์จุดแดงบนกระดิ่ง — พลาดได้ไม่เป็นไร ไม่ให้ล้มทั้งหน้า Dashboard
    listNotifications(activeHotelId)
      .then((n) => setUnreadCount(n.unreadCount))
      .catch(() => {});
  }

  // ต้องมี .catch() เสมอ ไม่งั้นเวลา API/ฐานข้อมูลล่ม (เช่น Prisma ต่อ Railway ไม่ติด → 500)
  // หน้าจะค้างหมุนตลอดไปเพราะ summary ยังเป็น null และผู้ใช้ไม่รู้ว่าเกิดอะไรขึ้น
  function reload() {
    setLoading(true);
    setError(null);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : null))
      .finally(() => setLoading(false));
  }

  useFocusEffect(useCallback(reload, [activeHotelId]));

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    await load().catch((err) => setError(err instanceof ApiError ? err.message : null));
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>สวัสดี, {user?.name ?? "คุณ"}</Text>
          <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.bellBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Pressable onPress={() => navigation.navigate("SwitchHotel")} style={styles.hotelPill}>
          <Ionicons name="business-outline" size={13} color={colors.signalBlue} />
          <Text style={styles.hotelPillText}>สลับโรงแรม</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.signalBlue} />
        ) : error || !summary ? (
          <ErrorState message={error ?? undefined} onRetry={reload} />
        ) : (
          <>
            <View style={styles.statGrid}>
              <StatCard label="งานทั้งหมด" value={summary.total} bg={colors.signalBlue} wide={isDesktop} delay={0} />
              <StatCard label="กำลังดำเนินการ" value={summary.onProcess} bg={colors.amber} wide={isDesktop} delay={60} />
              <StatCard label="เสร็จสิ้น" value={summary.done} bg={colors.green} wide={isDesktop} delay={120} />
              <StatCard label="ยกเลิก" value={summary.cancelled} bg={colors.slate} wide={isDesktop} delay={180} />
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>งานล่าสุด</Text>
              <Text onPress={() => navigation.navigate("JobsTab")} style={styles.viewAllLink}>
                ดูทั้งหมด
              </Text>
            </View>
            {summary.recentJobs.length === 0 ? (
              <Text style={styles.empty}>ยังไม่มีงานในโรงแรมนี้</Text>
            ) : (
              summary.recentJobs.map((job, i) => (
                <FadeInView key={job.id} delay={staggerDelay(i, 55)}>
                  <TicketCard
                    job={job}
                    onPress={() => navigation.navigate("JobDetail", { jobId: job.id })}
                  />
                </FadeInView>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// การ์ดตัวเลขสรุป — ไล่จางเข้าทีละใบ และตัวเลขนับขึ้นแทนการเด้งเปลี่ยนทันที
// ทำให้เห็นชัดว่าค่าเปลี่ยนไปหลังดึงหน้าจอรีเฟรช (เดิมตัวเลขเปลี่ยนเงียบๆ จนไม่ทันสังเกต)
function StatCard({
  label,
  value,
  bg,
  wide,
  delay,
}: {
  label: string;
  value: number;
  bg: string;
  wide?: boolean;
  delay?: number;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <FadeInView delay={delay} style={[styles.statCard, wide && styles.statCardWide, { backgroundColor: bg }]}>
      <CountUpText value={value} style={styles.statValue} format={(n) => String(n).padStart(3, "0")} />
      <Text style={styles.statLabel}>{label}</Text>
    </FadeInView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cloud },
  content: { padding: spacing.lg, paddingBottom: 60 },
  contentDesktop: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingHorizontal: spacing.xxxl },
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  greeting: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  bellBtn: { padding: 4 },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  hotelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: spacing.lg,
  },
  hotelPillText: { fontSize: 12.5, fontWeight: "700", color: colors.signalBlue },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl },
  statCard: { width: "47%", borderRadius: radius.md, padding: spacing.lg },
  statCardWide: { width: "23%" },
  statValue: { fontSize: 26, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 12.5, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  viewAllLink: { color: colors.signalBlue, fontSize: 12.5, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 10 },
  empty: { color: colors.textSecondary, fontSize: 13 },
});
