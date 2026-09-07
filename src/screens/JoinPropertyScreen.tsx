import { useEffect, useState } from "react";
import { Text, View, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import { showDialog } from "../utils/dialog";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { HotelMembership, joinHotel, listMyHotels } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "JoinProperty">;

export function JoinPropertyScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberships, setMemberships] = useState<HotelMembership[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const setActiveHotel = useAuthStore((s) => s.setActiveHotel);
  const logout = useAuthStore((s) => s.logout);
  const { isDesktop } = useResponsive();

  function handleLogout() {
    showDialog("ออกจากระบบ", "ยืนยันออกจากระบบใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: () => logout() },
    ]);
  }

  async function loadHotels() {
    try {
      const data = await listMyHotels();
      setMemberships(data);
    } catch {
      // ถ้าโหลดไม่สำเร็จ ผู้ใช้ยังกรอกรหัสเข้าทีมใหม่ได้อยู่ ไม่ต้องบล็อกทั้งหน้า
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadHotels();
  }, []);

  async function handleJoin() {
    if (code.trim().length !== 6) {
      showDialog("รหัสไม่ถูกต้อง", "รหัสเข้าทีมต้องมี 6 หลัก");
      return;
    }
    setLoading(true);
    try {
      await joinHotel(code.trim());
      showDialog("ส่งคำขอแล้ว", "รอ Admin ของโรงแรมอนุมัติก่อนถึงจะเข้าดูข้อมูลได้");
      setCode("");
      loadHotels();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "เข้าร่วมไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("เข้าร่วมไม่สำเร็จ", message);
    } finally {
      setLoading(false);
    }
  }

  async function selectHotel(membership: HotelMembership) {
    if (membership.status !== "APPROVED") {
      showDialog("ยังรออนุมัติ", "Admin ของโรงแรมนี้ยังไม่ได้อนุมัติคำขอของคุณ");
      return;
    }
    await setActiveHotel(membership.hotel.id, membership.role);
    // ไม่ต้องเรียก navigate/reset เอง — RootNavigator สลับไป Main ให้อัตโนมัติทันทีที่ activeHotelId ถูกตั้งค่า
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.title}>เข้าร่วมโรงแรมของคุณ</Text>
        <Text style={styles.subtitle}>
          กรอกรหัสทีมที่ได้จากหัวหน้าแผนก IT เพื่อขอเข้าถึงข้อมูลของโรงแรมนั้น
        </Text>

        <InputField
          dark
          placeholder="รหัสเข้าทีม 6 หลัก"
          autoCapitalize="characters"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        <PrimaryButton title="ขอเข้าร่วมทีม" onPress={handleJoin} loading={loading} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>หรือ</Text>
          <View style={styles.dividerLine} />
        </View>
        <PrimaryButton
          title="เป็นหัวหน้าแผนก? สร้างโรงแรมใหม่"
          onPress={() => navigation.navigate("CreateHotel")}
          variant="ghost"
        />

        <Text style={styles.sectionLabel}>โรงแรมของคุณ</Text>
        {loadingList ? (
          <ActivityIndicator color={colors.brassLight} />
        ) : (
          <FlatList
            data={memberships}
            keyExtractor={(item) => item.hotel.id}
            renderItem={({ item }) => (
              <Pressable onPress={() => selectHotel(item)} style={styles.hotelRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hotelRowText}>
                    {item.hotel.name}
                    {item.status === "PENDING" ? "  ·  รออนุมัติ" : "  ·  เข้าใช้งาน"}
                  </Text>
                </View>
                {item.status !== "PENDING" && <Ionicons name="chevron-forward" size={16} color="#B9BFD6" />}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>ยังไม่ได้เข้าร่วมโรงแรมไหนเลย</Text>}
          />
        )}

        <Text onPress={handleLogout} style={styles.logoutLink}>
          ไม่ใช่บัญชีนี้? ออกจากระบบ
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navyInk },
  content: { flex: 1, paddingHorizontal: 26, paddingTop: 60 },
  contentDesktop: { width: "100%", maxWidth: 460, alignSelf: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#9AA3C0", fontSize: 13, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  sectionLabel: { color: "#B9BFD6", fontSize: 12.5, fontWeight: "600", marginTop: 28, marginBottom: 10 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  dividerText: { color: "#8890A6", fontSize: 12 },
  logoutLink: { color: "#7B8299", fontSize: 12.5, textAlign: "center", marginTop: 30 },
  hotelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: spacing.lg,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  hotelRowText: { color: "#fff" },
  empty: { color: "#7B8299", fontSize: 13 },
});
