import { useCallback, useState } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Share, RefreshControl } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import {
  HotelDetail,
  PendingMember,
  TeamMember,
  approveMember,
  getHotelDetail,
  listMembers,
  listPendingMembers,
  regenerateJoinCode,
  removeMember,
} from "../api/hotels";
import { ErrorState } from "../components/ErrorState";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "TeamManagement">;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

function expiryText(iso: string | null) {
  if (!iso) return "ไม่มีวันหมดอายุ";
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0) return "หมดอายุแล้ว";
  if (days === 0) return "หมดอายุวันนี้";
  return `หมดอายุใน ${days} วัน`;
}

// หน้าจัดการทีม (Figma 15) — เฉพาะ Admin เท่านั้นที่เข้าถึงได้ (ฝั่ง server บังคับซ้ำอีกชั้นด้วย requireHotelAdmin)
export function TeamManagementScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { isDesktop } = useResponsive();

  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [detail, pendingList, memberList] = await Promise.all([
      getHotelDetail(activeHotelId),
      listPendingMembers(activeHotelId),
      listMembers(activeHotelId),
    ]);
    setHotel(detail);
    setPending(pendingList);
    setMembers(memberList);
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

  async function handleApprove(m: PendingMember) {
    setBusyId(m.id);
    try {
      await approveMember(activeHotelId, m.id);
      await load();
    } catch (err) {
      showDialog("อนุมัติไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
    } finally {
      setBusyId(null);
    }
  }

  function handleReject(m: PendingMember) {
    showDialog("ปฏิเสธคำขอนี้?", `${m.user.name} จะไม่ได้เข้าร่วมทีม (ขอใหม่ด้วยรหัสได้ภายหลัง)`, [
      { text: "ไม่ปฏิเสธ", style: "cancel" },
      {
        text: "ปฏิเสธ",
        style: "destructive",
        onPress: async () => {
          setBusyId(m.id);
          try {
            await removeMember(activeHotelId, m.id);
            await load();
          } catch (err) {
            showDialog("ปฏิเสธไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  function handleRemoveMember(m: TeamMember) {
    showDialog("เอาสมาชิกออกจากทีม?", `${m.user.name} จะไม่เห็นข้อมูลของโรงแรมนี้อีก`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "เอาออก",
        style: "destructive",
        onPress: async () => {
          setBusyId(m.id);
          try {
            await removeMember(activeHotelId, m.id);
            await load();
          } catch (err) {
            showDialog("เอาออกไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  function handleShareCode() {
    if (!hotel) return;
    // Share API ใช้ไม่ได้บนเว็บทุกเบราว์เซอร์ — ถ้าพลาดก็แค่ไม่เกิดอะไร ไม่ต้องขึ้น error รบกวนผู้ใช้
    Share.share({
      message: `เข้าร่วมทีม IT ของ ${hotel.name} ในแอป IT Tracking ด้วยรหัส: ${hotel.joinCode}`,
    }).catch(() => {});
  }

  function handleRegenerate() {
    showDialog("สร้างรหัสเข้าทีมใหม่?", "รหัสเดิมจะใช้ไม่ได้ทันที ต้องแจ้งรหัสใหม่ให้ทีมที่ยังไม่ได้สมัคร", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "สร้างรหัสใหม่",
        onPress: async () => {
          try {
            await regenerateJoinCode(activeHotelId);
            await load();
          } catch (err) {
            showDialog("สร้างรหัสใหม่ไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>จัดการทีม</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.signalBlue} />
      ) : error || !hotel ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.hotelLine}>
            <Ionicons name="business" size={13} color={colors.brass} />
            <Text style={styles.hotelLineText}>
              <Text style={styles.hotelName}>{hotel.name}</Text> · เฉพาะ Admin เท่านั้นที่เห็นหน้านี้
            </Text>
          </View>

          {/* รหัสเชิญทีม */}
          <View style={styles.codeCard}>
            <View style={styles.codeCardTop}>
              <Text style={styles.codeCardLabel}>รหัสเชิญทีม</Text>
              <Text style={styles.codeCardExpiry}>{expiryText(hotel.joinCodeExpires)}</Text>
            </View>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{hotel.joinCode}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={handleShareCode} style={styles.codeIconBtn}>
                  <Ionicons name="share-outline" size={16} color="#fff" />
                </Pressable>
                <Pressable onPress={handleRegenerate} style={styles.codeIconBtn}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* คำขอเข้าร่วม */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>คำขอเข้าร่วม</Text>
            {pending.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pending.length} รายการ</Text>
              </View>
            )}
          </View>
          <View style={styles.listCard}>
            {pending.length === 0 ? (
              <Text style={styles.emptyRow}>ยังไม่มีคำขอเข้าร่วมที่รออนุมัติ</Text>
            ) : (
              pending.map((m, i) => (
                <View key={m.id} style={[styles.row, i < pending.length - 1 && styles.rowDivider]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(m.user.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{m.user.name}</Text>
                    <Text style={styles.rowSub}>{m.user.email}</Text>
                  </View>
                  {busyId === m.id ? (
                    <ActivityIndicator color={colors.signalBlue} />
                  ) : (
                    <>
                      <Pressable onPress={() => handleReject(m)} style={[styles.actionBtn, { backgroundColor: colors.redBg }]}>
                        <Ionicons name="close" size={15} color={colors.red} />
                      </Pressable>
                      <Pressable onPress={() => handleApprove(m)} style={[styles.actionBtn, { backgroundColor: colors.greenBg }]}>
                        <Ionicons name="checkmark" size={15} color={colors.green} />
                      </Pressable>
                    </>
                  )}
                </View>
              ))
            )}
          </View>

          {/* สมาชิกทีม */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl, marginBottom: 10 }]}>
            สมาชิกทีม ({members.length})
          </Text>
          <View style={styles.listCard}>
            {members.map((m, i) => {
              const isMe = m.user.id === currentUserId;
              return (
                <View key={m.id} style={[styles.row, i < members.length - 1 && styles.rowDivider]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(m.user.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>
                      {m.user.name}
                      {isMe ? " (คุณ)" : ""}
                    </Text>
                    <Text style={styles.rowSub}>{m.role === "ADMIN" ? "Admin" : "ช่างเทคนิค"}</Text>
                  </View>
                  {/* กันเอาตัวเองออกจากทีมจนโรงแรมไม่เหลือ Admin */}
                  {!isMe &&
                    (busyId === m.id ? (
                      <ActivityIndicator color={colors.signalBlue} />
                    ) : (
                      <Pressable onPress={() => handleRemoveMember(m)} style={styles.removeBtn} hitSlop={6}>
                        <Ionicons name="person-remove-outline" size={17} color={colors.textTertiary} />
                      </Pressable>
                    ))}
                </View>
              );
            })}
          </View>
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
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 60 },
  contentDesktop: { width: "100%", maxWidth: 640, alignSelf: "center" },
  hotelLine: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: spacing.lg },
  hotelLineText: { fontSize: 11.5, color: colors.textSecondary, flex: 1 },
  hotelName: { color: colors.textPrimary, fontWeight: "700" },
  codeCard: { backgroundColor: colors.navyInk, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl },
  codeCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  codeCardLabel: { color: "#9AA3C0", fontSize: 12, fontWeight: "600" },
  codeCardExpiry: { color: colors.brassLight, fontSize: 11, fontWeight: "700" },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codeText: { color: "#fff", fontSize: 26, fontWeight: "700", letterSpacing: 3, fontFamily: "Courier" },
  codeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  countBadge: { backgroundColor: colors.amberBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText: { fontSize: 10.5, fontWeight: "700", color: colors.amber },
  listCard: { backgroundColor: colors.white, borderRadius: radius.md, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 13 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brass, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 11, fontWeight: "800", color: "#3A2C05" },
  rowName: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  rowSub: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  actionBtn: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  removeBtn: { padding: 4 },
  emptyRow: { fontSize: 12.5, color: colors.textTertiary, padding: spacing.lg },
});
