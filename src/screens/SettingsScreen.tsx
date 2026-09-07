import { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { PrimaryButton } from "../components/PrimaryButton";
import { listPendingMembers } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { ThemeMode, usePrefsStore } from "../store/prefsStore";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "ระบบ" },
  { value: "light", label: "สว่าง" },
  { value: "dark", label: "มืด" },
];

// หน้าตั้งค่า (Figma 13) — รวมทางเข้าเรื่องโรงแรม/ทีม, สวิตช์แจ้งเตือน, ข้อมูลระบบ และปุ่มออกจากระบบ
export function SettingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const activeHotelRole = useAuthStore((s) => s.activeHotelRole);
  const logout = useAuthStore((s) => s.logout);
  const pushEnabled = usePrefsStore((s) => s.pushEnabled);
  const setPushEnabled = usePrefsStore((s) => s.setPushEnabled);
  const themeMode = usePrefsStore((s) => s.themeMode);
  const setThemeMode = usePrefsStore((s) => s.setThemeMode);
  const { isDesktop } = useResponsive();

  const [pendingCount, setPendingCount] = useState(0);
  const isAdmin = activeHotelRole === "ADMIN";

  // จำนวนคำขอรออนุมัติ — โชว์เป็น badge ข้าง "จัดการทีม" ให้ Admin เห็นว่ามีอะไรค้างอยู่
  useFocusEffect(
    useCallback(() => {
      if (!isAdmin || !activeHotelId) return;
      listPendingMembers(activeHotelId)
        .then((list) => setPendingCount(list.length))
        .catch(() => {});
    }, [isAdmin, activeHotelId])
  );

  function handleLogout() {
    showDialog("ออกจากระบบ", "ยืนยันออกจากระบบใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: () => logout() },
    ]);
  }

  const appVersion = Constants.expoConfig?.version ?? "-";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>ตั้งค่า</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.sectionLabel}>ธีมการแสดงผล</Text>
        <View style={styles.segment}>
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setThemeMode(opt.value)}
              style={[styles.segmentItem, themeMode === opt.value && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, themeMode === opt.value && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>โรงแรม &amp; ทีม</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => navigation.navigate("SwitchHotel")}>
            <Ionicons name="swap-horizontal" size={19} color={colors.textSecondary} />
            <Text style={styles.rowText}>สลับ / เข้าร่วมโรงแรมอื่น</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          {/* จัดการทีมเป็นสิทธิ์ของ Admin เท่านั้น — ช่างเทคนิคจะไม่เห็นเมนูนี้ (server ก็กันไว้อีกชั้น) */}
          {isAdmin && (
            <Pressable
              style={[styles.row, styles.rowDivider]}
              onPress={() => navigation.navigate("TeamManagement")}
            >
              <Ionicons name="key-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.rowText}>จัดการทีม &amp; รหัสเชิญ</Text>
              {pendingCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount} รออนุมัติ</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              )}
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionLabel}>การแจ้งเตือน</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowTextWide}>แจ้งเตือนผ่านแอป (Push)</Text>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ true: colors.signalBlue, false: colors.border }}
            />
          </View>
        </View>
        <Text style={styles.hint}>
          ปิดสวิตช์นี้แล้วแอปจะไม่ลงทะเบียนรับ push notification ในครั้งถัดไปที่เปิดแอป
        </Text>

        <Text style={styles.sectionLabel}>ข้อมูลและระบบ</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={19} color={colors.textSecondary} />
            <Text style={styles.rowText}>ประวัติการแจ้งเตือน</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
          <View style={[styles.row, styles.rowDivider]}>
            <Ionicons name="information-circle-outline" size={19} color={colors.textSecondary} />
            <Text style={styles.rowText}>เวอร์ชันแอป</Text>
            <Text style={styles.versionText}>v{appVersion}</Text>
          </View>
        </View>

        <PrimaryButton
          title="ออกจากระบบ"
          onPress={handleLogout}
          variant="danger"
          icon="log-out-outline"
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
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
  contentDesktop: { width: "100%", maxWidth: 560, alignSelf: "center" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.textTertiary, marginTop: spacing.lg, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, overflow: "hidden" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10 },
  segmentItemActive: { backgroundColor: colors.navyInk },
  segmentText: { fontSize: 12.5, fontWeight: "700", color: colors.textSecondary },
  segmentTextActive: { color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: spacing.lg, paddingVertical: 15 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1, fontSize: 13.5, fontWeight: "600", color: colors.textPrimary },
  rowTextWide: { flex: 1, fontSize: 13.5, fontWeight: "600", color: colors.textPrimary },
  badge: { backgroundColor: colors.amberBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10.5, fontWeight: "700", color: colors.amber },
  versionText: { fontSize: 12.5, color: colors.textTertiary, fontFamily: "Courier" },
  hint: { fontSize: 11.5, color: colors.textTertiary, marginTop: 8, lineHeight: 17 },
});
