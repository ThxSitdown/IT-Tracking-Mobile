import { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ThemeColors } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { forgotPassword, resetPassword } from "../api/auth";
import { ApiError } from "../api/client";
import { showDialog } from "../utils/dialog";
import { AuthBackground } from "../components/auth/AuthBackground";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

// รวม 2 ขั้นตอนไว้ในหน้าเดียว (ขอรหัส → ตั้งรหัสใหม่) เพื่อไม่ให้ผู้ใช้ต้องสลับหน้าไปมา
// และไม่ต้องทำ deep link จากอีเมล — ผู้ใช้พิมพ์รหัส 6 หลักที่ได้รับกลับเข้ามาตรงนี้เลย
export function ForgotPasswordScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { isDesktop } = useResponsive();

  async function handleRequestCode() {
    if (!email.trim()) {
      showDialog("กรอกไม่ครบ", "กรุณากรอกอีเมลที่ใช้สมัคร");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      // ไปขั้นตอนถัดไปเสมอ ไม่ว่าอีเมลนี้จะมีในระบบหรือไม่ — ไม่งั้นหน้านี้จะกลายเป็นเครื่องมือไล่เช็คว่าใครสมัครไว้บ้าง
      setStep("reset");
    } catch (err) {
      showDialog("ขอรหัสไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (code.trim().length !== 6) {
      showDialog("รหัสไม่ถูกต้อง", "รหัสยืนยันต้องมี 6 หลัก");
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
      await resetPassword(email.trim(), code.trim(), password);
      showDialog("ตั้งรหัสผ่านใหม่สำเร็จ", "เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย", [
        { text: "เข้าสู่ระบบ", onPress: () => navigation.navigate("SignIn") },
      ]);
    } catch (err) {
      showDialog("ตั้งรหัสผ่านใหม่ไม่สำเร็จ", err instanceof ApiError ? err.message : "ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBackground>
      <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
            <Ionicons name="chevron-back" size={16} color="#B9BFD6" />
            <Text style={styles.backLinkText}>ย้อนกลับ</Text>
          </Pressable>

          {step === "request" ? (
            <>
              <Text style={styles.title}>ลืมรหัสผ่าน</Text>
              <Text style={styles.subtitle}>
                กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัสยืนยัน 6 หลักไปให้ (ใช้ได้ภายใน 15 นาที)
              </Text>
              <InputField
                dark
                icon="mail-outline"
                placeholder="อีเมล"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <PrimaryButton title="ส่งรหัสยืนยัน" onPress={handleRequestCode} loading={loading} variant="gold" />
            </>
          ) : (
            <>
              <Text style={styles.title}>ตั้งรหัสผ่านใหม่</Text>
              <Text style={styles.subtitle}>
                ถ้า {email.trim()} มีอยู่ในระบบ เราได้ส่งรหัสยืนยันไปให้แล้ว — กรอกรหัสและรหัสผ่านใหม่ด้านล่าง
              </Text>
              <InputField
                dark
                icon="key-outline"
                placeholder="รหัสยืนยัน 6 หลัก"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
              <InputField
                dark
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <InputField
                dark
                placeholder="ยืนยันรหัสผ่านใหม่"
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
              <PrimaryButton title="ตั้งรหัสผ่านใหม่" onPress={handleReset} loading={loading} variant="gold" />
              <Text onPress={() => setStep("request")} style={styles.link}>
                ไม่ได้รับรหัส? ขอใหม่อีกครั้ง
              </Text>
            </>
          )}
        </View>
      </View>
      </SafeAreaView>
    </AuthBackground>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 26 },
  card: { width: "100%" },
  cardDesktop: {
    maxWidth: 400,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 40,
  },
  backLink: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 16, alignSelf: "flex-start" },
  backLinkText: { color: "#B9BFD6", fontSize: 14 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#9AA3C0", fontSize: 13, marginBottom: 22, lineHeight: 20 },
  link: { color: colors.brassLight, textAlign: "center", marginTop: 20, fontWeight: "600" },
});
