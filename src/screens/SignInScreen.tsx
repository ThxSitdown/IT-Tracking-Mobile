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
import { loginRequest } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { showDialog } from "../utils/dialog";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

export function SignInScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const { isDesktop } = useResponsive();

  async function handleLogin() {
    if (!email || !password) {
      showDialog("กรอกไม่ครบ", "กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    try {
      const data = await loginRequest(email.trim(), password);
      await setSession(data);
      // ไม่ต้องเรียก navigate/reset เอง — RootNavigator ฟังสถานะ accessToken อยู่แล้ว
      // พอ setSession เสร็จ มันจะสลับไปกลุ่มหน้าจอถัดไปให้อัตโนมัติทันที
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("เข้าสู่ระบบไม่สำเร็จ", message);
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
            <AppLogo />

            <Text style={styles.titleTop}>เข้าสู่ระบบ</Text>
            <Text style={styles.titleBottom}>IT Tracking</Text>

            <Text style={styles.registerRow}>
              <Text style={styles.registerMuted}>ยังไม่มีบัญชี? </Text>
              <Text onPress={() => navigation.navigate("Register")} style={styles.registerLink}>
                สมัครใช้งาน
              </Text>
            </Text>

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
              placeholder="รหัสผ่าน"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotLink}>
              ลืมรหัสผ่าน?
            </Text>

            <PrimaryButton title="เข้าสู่ระบบ" onPress={handleLogin} loading={loading} variant="gold" />

            {/* ปุ่ม "เข้าสู่ระบบด้วย SSO โรงแรม" ในดีไซน์ ซ่อนไว้ก่อนจนกว่าจะมีระบบ SSO ฝั่ง server จริง
                จะเปิดใช้ก็แค่ใส่ <AuthDivider /> คั่น แล้วตามด้วย PrimaryButton variant="outlineDark"
                (คอมโพเนนต์ทั้งสองตัวยังอยู่ครบ ไม่ได้ลบทิ้ง) */}
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
  titleTop: { color: "#fff", fontSize: 25, fontWeight: "600", textAlign: "center", marginTop: spacing.xl },
  titleBottom: { color: "#fff", fontSize: 27, fontWeight: "800", textAlign: "center", marginTop: 2 },
  registerRow: { textAlign: "center", marginTop: 10, marginBottom: spacing.xxl, fontSize: 13 },
  registerMuted: { color: "#8890A6" },
  registerLink: { color: "#EFD48E", fontWeight: "700" },
  forgotLink: {
    color: "#EFD48E",
    textAlign: "right",
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: spacing.lg,
  },
});
