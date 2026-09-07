import { useState } from "react";
import { Text, View, StyleSheet, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppLogo } from "../components/auth/AppLogo";
import { AuthBackground } from "../components/auth/AuthBackground";
import { ThemeColors, spacing } from "../theme/tokens";
import { useThemedStyles } from "../theme/ThemeProvider";
import { registerRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { showDialog } from "../utils/dialog";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const { isDesktop } = useResponsive();

  async function handleRegister() {
    if (!name || !email || !password) {
      showDialog("กรอกไม่ครบ", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password.length < 8) {
      showDialog("รหัสผ่านสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      showDialog("รหัสผ่านไม่ตรงกัน", "กรุณายืนยันรหัสผ่านให้ตรงกัน");
      return;
    }
    setLoading(true);
    try {
      const data = await registerRequest(name.trim(), email.trim(), password);
      await setSession(data);
      // ไม่ต้องเรียก navigate/reset เอง — RootNavigator สลับหน้าจอให้อัตโนมัติตาม accessToken ในสโตร์
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "สมัครใช้งานไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("สมัครใช้งานไม่สำเร็จ", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBackground>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isDesktop && styles.cardDesktop]}>
            <AppLogo size={72} />

            <Text style={styles.titleTop}>สร้างบัญชีผู้ใช้</Text>
            <Text style={styles.titleBottom}>IT Tracking</Text>

            <Text style={styles.registerRow}>
              <Text style={styles.registerMuted}>มีบัญชีแล้ว? </Text>
              <Text onPress={() => navigation.navigate("SignIn")} style={styles.registerLink}>
                เข้าสู่ระบบ
              </Text>
            </Text>

            <InputField
              dark
              icon="person-outline"
              placeholder="ชื่อ-นามสกุล"
              value={name}
              onChangeText={setName}
            />
            <InputField
              dark
              icon="mail-outline"
              placeholder="you@hotel.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <InputField
              dark
              icon="lock-closed-outline"
              placeholder="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <InputField
              dark
              icon="shield-checkmark-outline"
              placeholder="ยืนยันรหัสผ่าน"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />

            <PrimaryButton
              title="สมัครใช้งาน"
              onPress={handleRegister}
              loading={loading}
              variant="gold"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthBackground>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 26, paddingVertical: 32 },
  card: { width: "100%" },
  cardDesktop: {
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 40,
  },
  titleTop: { color: "#fff", fontSize: 24, fontWeight: "600", textAlign: "center", marginTop: spacing.lg },
  titleBottom: { color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center", marginTop: 2 },
  registerRow: { textAlign: "center", marginTop: 10, marginBottom: spacing.xl, fontSize: 13 },
  registerMuted: { color: "#8890A6" },
  registerLink: { color: "#EFD48E", fontWeight: "700" },
});
