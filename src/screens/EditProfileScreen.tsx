import { useState } from "react";
import { Text, View, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { changePassword, updateProfile } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { showDialog } from "../utils/dialog";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "EditProfile">;

export function EditProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const { isDesktop } = useResponsive();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const profileChanged = name.trim() !== (user?.name ?? "") || email.trim() !== (user?.email ?? "");

  async function handleSaveProfile() {
    if (!name.trim() || !email.trim()) {
      showDialog("กรอกไม่ครบ", "ชื่อและอีเมลห้ามว่าง");
      return;
    }
    setSavingProfile(true);
    try {
      // ส่งเฉพาะฟิลด์ที่เปลี่ยนจริง — server จะได้ไม่ต้องเช็คอีเมลซ้ำโดยไม่จำเป็น
      const patch: { name?: string; email?: string } = {};
      if (name.trim() !== user?.name) patch.name = name.trim();
      if (email.trim() !== user?.email) patch.email = email.trim();

      const updated = await updateProfile(patch);
      await setUser({ id: updated.id, name: updated.name, email: updated.email });
      showDialog("บันทึกแล้ว", "อัปเดตโปรไฟล์เรียบร้อย");
    } catch (err) {
      showDialog("บันทึกไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      showDialog("กรอกไม่ครบ", "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่");
      return;
    }
    if (newPassword.length < 8) {
      showDialog("รหัสผ่านสั้นเกินไป", "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      showDialog("รหัสผ่านไม่ตรงกัน", "กรุณายืนยันรหัสผ่านใหม่ให้ตรงกัน");
      return;
    }

    setSavingPassword(true);
    try {
      // server เพิกถอน session อื่นทั้งหมดแล้วคืน token คู่ใหม่มาให้เครื่องนี้ ต้องเก็บทับของเดิม
      // ไม่งั้นเครื่องนี้จะถือ token ที่เพิ่งถูกเพิกถอนไปด้วย แล้วหลุดล็อกอินทันที
      const tokens = await changePassword(currentPassword, newPassword);
      await setTokens(tokens.accessToken, tokens.refreshToken);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showDialog("เปลี่ยนรหัสผ่านแล้ว", "อุปกรณ์อื่นที่ยังล็อกอินค้างไว้จะถูกให้ออกจากระบบทั้งหมด");
    } catch (err) {
      showDialog("เปลี่ยนรหัสผ่านไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>แก้ไขโปรไฟล์</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <Text style={styles.sectionLabel}>ข้อมูลผู้ใช้</Text>
        <View style={styles.card}>
          <Text style={styles.label}>ชื่อ-นามสกุล</Text>
          <InputField placeholder="ชื่อ-นามสกุล" value={name} onChangeText={setName} />
          <Text style={styles.label}>อีเมล</Text>
          <InputField
            placeholder="อีเมล"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton
            title="บันทึกข้อมูล"
            onPress={handleSaveProfile}
            loading={savingProfile}
            disabled={!profileChanged}
            variant="blue"
          />
        </View>

        <Text style={styles.sectionLabel}>เปลี่ยนรหัสผ่าน</Text>
        <View style={styles.card}>
          <Text style={styles.label}>รหัสผ่านปัจจุบัน</Text>
          <InputField
            placeholder="รหัสผ่านปัจจุบัน"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <Text style={styles.label}>รหัสผ่านใหม่</Text>
          <InputField
            placeholder="อย่างน้อย 8 ตัวอักษร"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Text style={styles.label}>ยืนยันรหัสผ่านใหม่</Text>
          <InputField
            placeholder="ยืนยันรหัสผ่านใหม่"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <PrimaryButton title="เปลี่ยนรหัสผ่าน" onPress={handleChangePassword} loading={savingPassword} />
          <Text style={styles.hint}>
            เมื่อเปลี่ยนรหัสผ่านสำเร็จ อุปกรณ์อื่นที่ล็อกอินค้างไว้จะถูกให้ออกจากระบบทั้งหมดเพื่อความปลอดภัย
          </Text>
        </View>
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
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg },
  label: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  hint: { fontSize: 11.5, color: colors.textTertiary, marginTop: 12, lineHeight: 17 },
});
