import { Text, View, StyleSheet, Pressable } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { CompositeScreenProps } from "@react-navigation/native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuthStore } from "../store/authStore";
import { useResponsive } from "../hooks/useResponsive";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "ProfileTab">,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeHotelRole = useAuthStore((s) => s.activeHotelRole);
  const { isDesktop } = useResponsive();

  function handleLogout() {
    showDialog("ออกจากระบบ", "ยืนยันออกจากระบบใช่ไหม?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: () => logout() },
      // ไม่ต้อง navigate/reset เอง — RootNavigator ฟัง accessToken อยู่แล้ว สลับไป Sign In ให้เองทันที
    ]);
  }

  const isAdmin = activeHotelRole === "ADMIN";

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.slice(0, 2).toUpperCase() ?? "??"}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "-"}</Text>
        <Text style={styles.email}>{user?.email ?? "-"}</Text>

        <View style={styles.menuCard}>
          <Pressable style={styles.menuRow} onPress={() => navigation.navigate("EditProfile")}>
            <Ionicons name="person-outline" size={19} color={colors.textSecondary} />
            <Text style={styles.menuRowText}>แก้ไขโปรไฟล์ &amp; รหัสผ่าน</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <Pressable style={[styles.menuRow, styles.menuDivider]} onPress={() => navigation.navigate("SwitchHotel")}>
            <Ionicons name="business-outline" size={19} color={colors.textSecondary} />
            <Text style={styles.menuRowText}>สลับ / เข้าร่วมโรงแรมอื่น</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <Pressable style={[styles.menuRow, styles.menuDivider]} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={19} color={colors.textSecondary} />
            <Text style={styles.menuRowText}>การแจ้งเตือน</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          {isAdmin && (
            <Pressable style={[styles.menuRow, styles.menuDivider]} onPress={() => navigation.navigate("TeamManagement")}>
              <Ionicons name="people-outline" size={19} color={colors.textSecondary} />
              <Text style={styles.menuRowText}>จัดการทีม &amp; รหัสเชิญ</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          )}

          <Pressable style={[styles.menuRow, styles.menuDivider]} onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
            <Text style={styles.menuRowText}>ตั้งค่า</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* alignSelf: "stretch" จำเป็น เพราะ content ตั้ง alignItems: "center" ไว้ ปุ่มเลยหดตามความกว้างข้อความ */}
        <PrimaryButton
          title="ออกจากระบบ"
          onPress={handleLogout}
          variant="danger"
          icon="log-out-outline"
          style={{ marginTop: spacing.xl, alignSelf: "stretch" }}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cloud },
  content: { padding: spacing.lg, alignItems: "center", paddingTop: 40 },
  contentDesktop: { width: "100%", maxWidth: 420, alignSelf: "center" },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: "#3A2C05", fontSize: 26, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  email: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xl },
  menuCard: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.lg,
  },
  menuRowText: { flex: 1, fontSize: 13.5, fontWeight: "600", color: colors.textPrimary },
  menuDivider: { borderTopWidth: 1, borderTopColor: colors.border },
});
