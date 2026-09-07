import { useCallback, useState } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { PrimaryButton } from "../components/PrimaryButton";
import { HotelMembership, listMyHotels } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "SwitchHotel">;

// หน้าสลับโรงแรม (Figma 14) — เดิมใช้หน้า Join Property ซ้ำไปก่อน ตอนนี้แยกออกมาเป็นหน้าจริง
// ต่างจาก Join Property ตรงที่หน้านี้ "เลือกจากโรงแรมที่เป็นสมาชิกอยู่แล้ว" ไม่ใช่หน้ากรอกรหัสเข้าร่วมใหม่
export function SwitchHotelScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const setActiveHotel = useAuthStore((s) => s.setActiveHotel);
  const clearActiveHotel = useAuthStore((s) => s.clearActiveHotel);
  const { isDesktop } = useResponsive();

  const [memberships, setMemberships] = useState<HotelMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setMemberships(await listMyHotels());
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().catch(() => {}).finally(() => setLoading(false));
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  async function handleSelect(m: HotelMembership) {
    if (m.status !== "APPROVED") {
      showDialog("ยังรออนุมัติ", "Admin ของโรงแรมนี้ยังไม่ได้อนุมัติคำขอของคุณ");
      return;
    }
    if (m.hotel.id === activeHotelId) {
      navigation.goBack();
      return;
    }
    await setActiveHotel(m.hotel.id, m.role);
    // สลับโรงแรมแล้วต้องกลับไปหน้าหลัก ไม่ใช่ค้างอยู่หน้านี้ — ข้อมูลทุกหน้าจะโหลดใหม่ตาม hotelId ที่เปลี่ยน
    navigation.goBack();
  }

  const approvedCount = memberships.filter((m) => m.status === "APPROVED").length;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>เลือกโรงแรม</Text>
        <Text onPress={() => navigation.goBack()} style={styles.closeLink}>
          ปิด
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.signalBlue} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.subtitle}>
            คุณเป็นสมาชิกทีม IT ของ {approvedCount} โรงแรม สลับเพื่อดูใบงาน/บันทึกของโรงแรมนั้นๆ
          </Text>

          {memberships.map((m) => {
            const isActive = m.hotel.id === activeHotelId;
            const isPending = m.status !== "APPROVED";
            return (
              <Pressable
                key={m.hotel.id}
                onPress={() => handleSelect(m)}
                style={[styles.card, isActive && styles.cardActive, isPending && styles.cardPending]}
              >
                <View style={[styles.logo, isActive ? styles.logoActive : isPending && styles.logoPending]}>
                  <Ionicons
                    name={isPending ? "time" : "business"}
                    size={20}
                    color={isPending ? "#9C6A05" : isActive ? colors.brassLight : colors.slate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{m.hotel.name}</Text>
                  <Text style={[styles.cardMeta, isPending && styles.cardMetaPending]}>
                    {isPending
                      ? "รออนุมัติจาก Admin"
                      : [m.hotel.city, m.role === "ADMIN" ? "Admin" : "ช่างเทคนิค", `${m.hotel.memberCount} สมาชิก`]
                          .filter(Boolean)
                          .join(" · ")}
                  </Text>
                </View>
                {!isPending &&
                  (isActive ? (
                    <View style={styles.checkOn}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.checkOff} />
                  ))}
              </Pressable>
            );
          })}

          <View style={styles.divider} />
          {/* หน้า Join Property อยู่คนละกลุ่มของ RootNavigator (กลุ่ม "ยังไม่ได้เลือกโรงแรม") จึง navigate ตรงไปไม่ได้
              — ล้างโรงแรมที่ใช้งานอยู่แทน แล้ว RootNavigator จะสลับไปหน้านั้นให้เอง (ไม่ได้ออกจากระบบ) */}
          <PrimaryButton
            title="เข้าร่วมโรงแรมอื่นด้วยรหัส"
            variant="ghost"
            onPress={() => clearActiveHotel()}
          />
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
  closeLink: { color: colors.textSecondary, fontSize: 15, fontWeight: "600", width: 40, textAlign: "right" },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 60 },
  contentDesktop: { width: "100%", maxWidth: 560, alignSelf: "center" },
  subtitle: { fontSize: 12.5, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 19 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardActive: { borderColor: colors.signalBlue },
  cardPending: { opacity: 0.6 },
  logo: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateBg },
  logoActive: { backgroundColor: colors.navyInk },
  logoPending: { backgroundColor: colors.amberBg },
  cardName: { fontSize: 14.5, fontWeight: "700", color: colors.textPrimary },
  cardMeta: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  cardMetaPending: { color: "#9C6A05" },
  checkOn: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.signalBlue, alignItems: "center", justifyContent: "center" },
  checkOff: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
});
