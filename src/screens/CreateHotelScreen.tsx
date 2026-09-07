import { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
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
import { createHotel } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "CreateHotel">;

export function CreateHotelScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdHotel, setCreatedHotel] = useState<{ id: string; joinCode: string } | null>(null);
  const setActiveHotel = useAuthStore((s) => s.setActiveHotel);
  const { isDesktop } = useResponsive();

  async function handleCreate() {
    if (!name.trim()) {
      showDialog("กรอกไม่ครบ", "กรุณากรอกชื่อโรงแรม");
      return;
    }
    setLoading(true);
    try {
      const hotel = await createHotel(name.trim(), city.trim() || undefined);
      // ผู้สร้างกลายเป็น Admin ของโรงแรมนี้โดยอัตโนมัติ (อนุมัติตัวเองแล้วในตัว server)
      // ยังไม่ตั้งเป็นโรงแรม active ตอนนี้ — รอให้ผู้ใช้กดปุ่มยืนยันหลังเห็นรหัสเข้าทีมก่อน
      // (ถ้าตั้ง active ทันที RootNavigator จะสลับหน้าไป Main เลย ผู้ใช้จะไม่ทันเห็นรหัสที่ต้องเอาไปแจกทีม)
      setCreatedHotel({ id: hotel.id, joinCode: hotel.joinCode });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "สร้างโรงแรมไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("สร้างโรงแรมไม่สำเร็จ", message);
    } finally {
      setLoading(false);
    }
  }

  // หลังสร้างสำเร็จ โชว์รหัสเข้าทีมให้ก่อน เพราะต้องเอาไปแจกทีมช่างของโรงแรมต่อ
  if (createdHotel) {
    return (
      <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={40} color={colors.brass} />
          </View>
          <Text style={styles.successTitle}>สร้างโรงแรมสำเร็จ</Text>
          <Text style={styles.successSubtitle}>
            นี่คือรหัสเข้าทีมของโรงแรมคุณ — ส่งให้ช่างเทคนิคในทีมเพื่อสมัครเข้าร่วม
            (พวกเขาต้องรอคุณอนุมัติในหน้า "จัดการทีม" ก่อนถึงจะเห็นข้อมูลได้)
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{createdHotel.joinCode}</Text>
          </View>
          <PrimaryButton
            title="ไปที่ Dashboard"
            onPress={() => setActiveHotel(createdHotel.id, "ADMIN")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Ionicons name="chevron-back" size={16} color="#B9BFD6" />
          <Text style={styles.backLinkText}>ย้อนกลับ</Text>
        </Pressable>
        <Text style={styles.title}>สร้างโรงแรมของคุณ</Text>
        <Text style={styles.subtitle}>
          สำหรับหัวหน้าแผนก IT ที่ยังไม่มีทีมในระบบ — สร้างแล้วคุณจะเป็น Admin
          ของโรงแรมนี้ทันที และได้รหัสเข้าทีมไปแจกให้ทีมช่าง
        </Text>

        <InputField dark placeholder="ชื่อโรงแรม" value={name} onChangeText={setName} />
        <InputField dark placeholder="เมือง (ไม่บังคับ)" value={city} onChangeText={setCity} />

        <PrimaryButton title="สร้างโรงแรม" onPress={handleCreate} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navyInk },
  content: { flex: 1, paddingHorizontal: 26, paddingTop: 60 },
  contentDesktop: { width: "100%", maxWidth: 460, alignSelf: "center" },
  backLink: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 20, alignSelf: "flex-start" },
  backLinkText: { color: "#B9BFD6", fontSize: 14 },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 10 },
  subtitle: { color: "#9AA3C0", fontSize: 13, marginBottom: 24, lineHeight: 20 },
  successTitle: { color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 10, textAlign: "center" },
  successSubtitle: { color: "#9AA3C0", fontSize: 13, marginBottom: 24, lineHeight: 20, textAlign: "center" },
  codeBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: colors.brassLight,
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  codeText: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: 6, fontFamily: "Courier" },
});
