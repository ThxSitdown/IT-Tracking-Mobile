import { useCallback, useState } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import {
  AppNotification,
  NotificationType,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { ErrorState } from "../components/ErrorState";
import { FadeInView, PressableScale } from "../components/Motion";
import { staggerDelay } from "../utils/animation";
import { ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

type IoniconName = keyof typeof Ionicons.glyphMap;

// หน้าตาแต่ละชนิดการแจ้งเตือน — คุมไอคอน/สีไว้ที่เดียว เพิ่มชนิดใหม่ก็มาเติมตรงนี้จุดเดียว
// รับชุดสีเข้ามาเพราะสีต้องเปลี่ยนตามธีม (สีพื้นโทนอ่อนจะจ้าเกินไปบนพื้นมืด)
const getTypeMeta = (
  colors: ThemeColors
): Record<NotificationType, { icon: IoniconName; color: string; bg: string }> => ({
  JOB_CREATED: { icon: "add-circle", color: colors.amber, bg: colors.amberBg },
  JOB_ASSIGNED: { icon: "briefcase", color: colors.signalBlue, bg: colors.slateBg },
  NOTE_ADDED: { icon: "chatbubble-ellipses", color: colors.slate, bg: colors.slateBg },
  JOB_CLOSED: { icon: "checkmark-circle", color: colors.green, bg: colors.greenBg },
});

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// จัดกลุ่มเป็น "วันนี้ / เมื่อวาน / วันที่..." ตามดีไซน์ — คิดจากเวลาเครื่องผู้ใช้
function groupLabel(iso: string): string {
  const today = startOfDay(new Date());
  const day = startOfDay(new Date(iso));
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays <= 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const { isDesktop } = useResponsive();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await listNotifications(activeHotelId);
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }

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

  async function handleReadAll() {
    // อัปเดตหน้าจอทันทีก่อน แล้วค่อยยิง API — ผู้ใช้ไม่ต้องรอ (ถ้าพลาดจะรีเฟรชกลับตอน load รอบหน้า)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead(activeHotelId).catch(() => {});
  }

  async function handlePress(item: AppNotification) {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(activeHotelId, item.id).catch(() => {});
    }
    if (item.jobId) navigation.navigate("JobDetail", { jobId: item.jobId });
  }

  // แบ่งกลุ่มตามวัน โดยยังคงลำดับใหม่→เก่าที่ server ส่งมา
  const groups: { label: string; items: AppNotification[] }[] = [];
  for (const item of items) {
    const label = groupLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>การแจ้งเตือน</Text>
        {unreadCount > 0 ? (
          <Text onPress={handleReadAll} style={styles.readAllLink}>
            อ่านทั้งหมด
          </Text>
        ) : (
          <View style={{ width: 62 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.signalBlue} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : groups.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>ยังไม่มีการแจ้งเตือน</Text>
              <Text style={styles.emptyHint}>
                เมื่อมีใบงานใหม่เข้ามา มีคนมอบหมายงานให้คุณ เพิ่มบันทึกในงานที่คุณดูแล หรือปิดงาน จะขึ้นแจ้งเตือนที่นี่
              </Text>
            </View>
          ) : (
            groups.map((group, gi) => (
              <View key={group.label}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item, i) => {
                  // แอปเวอร์ชันเก่าอาจยังไม่รู้จักชนิดแจ้งเตือนที่ server เพิ่งเพิ่ม — ใช้ไอคอนกลางแทนไม่ให้จอพัง
                  const meta = getTypeMeta(colors)[item.type] ?? {
                    icon: "notifications" as IoniconName,
                    color: colors.slate,
                    bg: colors.slateBg,
                  };
                  return (
                    // ไล่ขึ้นทีละใบต่อเนื่องข้ามกลุ่ม (gi * 2) เพื่อไม่ให้กลุ่มถัดไปเริ่มนับใหม่จนดูสะดุด
                    <FadeInView key={item.id} delay={staggerDelay(gi * 2 + i, 40)}>
                    <PressableScale
                      onPress={() => handlePress(item)}
                      style={[styles.card, item.read && styles.cardRead]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardBody} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      {!item.read && <View style={styles.unreadDot} />}
                    </PressableScale>
                    </FadeInView>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cloud },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  readAllLink: { color: colors.signalBlue, fontSize: 12.5, fontWeight: "700", width: 62, textAlign: "right" },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 60 },
  contentDesktop: { width: "100%", maxWidth: 640, alignSelf: "center" },
  groupLabel: { fontSize: 12, fontWeight: "700", color: colors.textTertiary, marginTop: 10, marginBottom: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 10,
  },
  cardRead: { opacity: 0.65 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  cardBody: { fontSize: 12, color: colors.textSecondary, marginVertical: 2, lineHeight: 17 },
  cardTime: { fontSize: 11, color: colors.textTertiary },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.signalBlue, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  emptyHint: { fontSize: 12.5, color: colors.textTertiary, textAlign: "center", lineHeight: 19, paddingHorizontal: 30 },
});
