import { useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { InputField } from "../components/InputField";
import { SelectField } from "../components/SelectField";
import { DatePickerField } from "../components/DatePickerField";
import { PhotoGallery } from "../components/PhotoGallery";
import { PrimaryButton } from "../components/PrimaryButton";
import { AssigneePicker } from "../components/AssigneePicker";
import { FadeInView } from "../components/Motion";
import { createJob } from "../api/jobs";
import { AssignableMember, listAssignableMembers } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { TASK_TYPES } from "../constants/taskTypes";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "AddJob">;

export function AddJobScreen({ navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const [description, setDescription] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [taskType, setTaskType] = useState("");
  const [room, setRoom] = useState("");
  const [property, setProperty] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  // ใบงานยังไม่ถูกสร้าง จึงยังไม่มี id ให้ผูกรูป — เก็บ path ที่อัปโหลดแล้วไว้ก่อน
  // แล้วส่งไปพร้อมกันตอนกดบันทึก (server สร้างใบงาน+ผูกรูปในคำสั่งเดียว)
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  // มอบหมายผู้รับผิดชอบได้เลยตั้งแต่ตอนสร้าง (หลายคนได้) — server จะยิงแจ้งเตือนให้ทุกคนที่ถูกเลือก
  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { isDesktop } = useResponsive();

  useEffect(() => {
    // รายชื่อสมาชิกโหลดพลาดก็ยังสร้างงานได้ตามปกติ แค่ยังมอบหมายในหน้านี้ไม่ได้
    listAssignableMembers(activeHotelId).then(setMembers).catch(() => {});
  }, [activeHotelId]);

  async function handleSave() {
    if (!description.trim() || !requestedBy.trim() || !taskType.trim()) {
      showDialog("กรอกไม่ครบ", "กรุณากรอกรายละเอียดงาน, แจ้งโดย และประเภทงาน");
      return;
    }
    setLoading(true);
    try {
      await createJob(activeHotelId, {
        description: description.trim(),
        requestedBy: requestedBy.trim(),
        taskType: taskType.trim(),
        room: room.trim() || undefined,
        property: property.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        photoUrls: photoUrls.length ? photoUrls : undefined,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
      });
      navigation.goBack();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("บันทึกไม่สำเร็จ", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text onPress={() => navigation.goBack()} style={styles.cancelLink}>
          ยกเลิก
        </Text>
        <Text style={styles.title}>เพิ่มงานใหม่</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <FadeInView>
        <Text style={styles.label}>รายละเอียดงาน</Text>
        <InputField
          placeholder="ระบุอาการ/สิ่งที่ต้องแก้ไข..."
          value={description}
          onChangeText={setDescription}
          multiline
          height={90}
        />
        <Text style={styles.label}>แจ้งโดย</Text>
        <InputField placeholder="เช่น Front Desk, Housekeeping" value={requestedBy} onChangeText={setRequestedBy} />
        <Text style={styles.label}>ประเภทงาน</Text>
        <SelectField
          label="เลือกประเภทงาน"
          placeholder="เลือกประเภทงาน IT Support"
          value={taskType}
          onChange={setTaskType}
          options={TASK_TYPES}
        />
        <Text style={styles.label}>ผู้รับผิดชอบ (ไม่บังคับ)</Text>
        <AssigneePicker members={members} value={assigneeIds} onChange={setAssigneeIds} disabled={loading} />
        <Text style={styles.label}>วันที่ต้องการให้เสร็จ (ไม่บังคับ)</Text>
        <DatePickerField label="เลือกวันที่ต้องการให้เสร็จ" placeholder="เลือกวันที่" value={dueDate} onChange={setDueDate} />
        <Text style={styles.label}>ห้อง / โซน</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <InputField placeholder="ห้อง" value={room} onChangeText={setRoom} style={{ flex: 1 }} />
          <InputField placeholder="โซน/อาคาร" value={property} onChangeText={setProperty} style={{ flex: 1 }} />
        </View>
        <Text style={styles.label}>รูปภาพหน้างาน (ไม่บังคับ)</Text>
        <PhotoGallery
          photos={photoUrls.map((url) => ({ id: null, url }))}
          onAdd={(url) => setPhotoUrls((prev) => [...prev, url])}
          onRemove={(photo) => setPhotoUrls((prev) => prev.filter((u) => u !== photo.url))}
        />
        <PrimaryButton title="บันทึกงาน" onPress={handleSave} loading={loading} style={{ marginTop: 12 }} />
        </FadeInView>
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
  cancelLink: { color: colors.textSecondary, fontSize: 15, width: 50 },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  content: { padding: spacing.lg },
  contentDesktop: { width: "100%", maxWidth: 640, alignSelf: "center" },
  label: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
});
