import { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, getStatusMeta, lightColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { InputField } from "../components/InputField";
import { SelectField } from "../components/SelectField";
import { DatePickerField } from "../components/DatePickerField";
import { PhotoGallery } from "../components/PhotoGallery";
import { AssigneePicker } from "../components/AssigneePicker";
import { addJobPhoto, deleteJobPhoto, getJob, setJobAssignees, updateJob, Job, JobStatus } from "../api/jobs";
import { AssignableMember, listAssignableMembers } from "../api/hotels";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";

type Props = NativeStackScreenProps<RootStackParamList, "EditJob">;

const STATUS_OPTIONS: { label: string; value: JobStatus }[] = [
  // ป้ายสถานะเป็นข้อความคงที่ ไม่เปลี่ยนตามธีม จึงอ่านจากชุดสีสว่างได้เลย (ใช้แค่ .label)
  { label: getStatusMeta(lightColors).ON_PROCESS.label, value: "ON_PROCESS" },
  { label: getStatusMeta(lightColors).DONE.label, value: "DONE" },
  { label: getStatusMeta(lightColors).CANCELLED.label, value: "CANCELLED" },
];

// หน้าแก้ไขใบงาน (Figma 08) — ต่างจาก Job Detail ตรงที่หน้านี้แก้หลายฟิลด์พร้อมกันแล้วกด "บันทึก" ครั้งเดียว
// ส่วน Job Detail จะบันทึกทันทีทีละอย่าง (มอบหมาย/ตั้งวันที่/เพิ่มบันทึก) เหมาะกับการใช้งานหน้างานมากกว่า
// เลขที่งาน/วันที่แจ้ง/ห้อง/โซน แสดงเป็นข้อมูลอ่านอย่างเดียวตามดีไซน์ (ไม่ให้แก้ย้อนหลัง)
export function EditJobScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { jobId } = route.params;
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const { isDesktop } = useResponsive();

  const [job, setJob] = useState<Job | null>(null);
  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ค่าที่กำลังแก้อยู่ในฟอร์ม — แยกจาก job เดิมไว้ เพื่อเทียบตอนบันทึกว่ามีอะไรเปลี่ยนจริงบ้าง
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<JobStatus>("ON_PROCESS");
  const [dueDate, setDueDate] = useState<string | null>(null);
  // รูปบันทึกทันทีที่เพิ่ม/ลบ (ไม่รอปุ่ม "บันทึก" เหมือนฟิลด์อื่น) เพราะไฟล์ถูกอัปโหลดขึ้น server ไปแล้ว
  // ถ้าให้รอกดบันทึก แล้วผู้ใช้กดยกเลิก จะเหลือไฟล์ค้างบน server ที่ไม่มีใครอ้างถึง
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      getJob(activeHotelId, jobId)
        .then((data) => {
          if (!alive) return;
          const j = data as Job;
          setJob(j);
          setDescription(j.taskDescription);
          setAssigneeIds((j.assignees ?? []).map((a) => a.id));
          setStatus(j.status);
          setDueDate(j.dueDate ? j.dueDate.slice(0, 10) : null);
          setPhotos(j.photos ?? []);
        })
        .catch(() => {})
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, [activeHotelId, jobId])
  );

  useEffect(() => {
    listAssignableMembers(activeHotelId).then(setMembers).catch(() => {});
  }, [activeHotelId]);

  async function handleSave() {
    if (!job) return;
    if (!description.trim()) {
      showDialog("กรอกไม่ครบ", "รายละเอียดงานห้ามว่าง");
      return;
    }

    // ส่งเฉพาะฟิลด์ที่เปลี่ยนจริง — กันการเขียนทับค่าเดิมโดยไม่ตั้งใจ และไม่ยิงแจ้งเตือน "มอบหมายใหม่" ซ้ำ
    const patch: Parameters<typeof updateJob>[2] = {};
    if (description.trim() !== job.taskDescription) patch.taskDescription = description.trim();
    if (status !== job.status) patch.status = status;

    const originalDue = job.dueDate ? job.dueDate.slice(0, 10) : null;
    if (dueDate !== originalDue) patch.dueDate = dueDate ? new Date(dueDate).toISOString() : null;


    // ผู้รับผิดชอบเป็นความสัมพันธ์หลายรายการ จึงมี endpoint ของตัวเองแยกจาก patch ฟิลด์ธรรมดา
    const originalAssignees = (job.assignees ?? []).map((a) => a.id);
    const assigneesChanged =
      originalAssignees.length !== assigneeIds.length ||
      originalAssignees.some((id) => !assigneeIds.includes(id));

    if (Object.keys(patch).length === 0 && !assigneesChanged) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(patch).length > 0) await updateJob(activeHotelId, jobId, patch);
      if (assigneesChanged) await setJobAssignees(activeHotelId, jobId, assigneeIds);
      navigation.goBack();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("บันทึกไม่สำเร็จ", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text onPress={() => navigation.goBack()} style={styles.cancelLink}>
          ยกเลิก
        </Text>
        <Text style={styles.title}>แก้ไขใบงาน</Text>
        <Text onPress={saving ? undefined : handleSave} style={[styles.saveLink, saving && styles.saveLinkDisabled]}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Text>
      </View>

      {loading || !job ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.signalBlue} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
          {/* ข้อมูลที่แก้ไม่ได้ — โชว์ไว้ให้รู้ว่ากำลังแก้ใบงานไหนอยู่ */}
          <View style={styles.metaCard}>
            <MetaCell label="เลขที่" value={`#${job.jobID}`} mono />
            <MetaCell label="ห้อง" value={job.room ?? "-"} mono />
            <MetaCell label="วันที่แจ้ง" value={new Date(job.requestDate).toLocaleDateString("th-TH")} mono />
            <MetaCell label="โซน" value={job.property ?? "-"} mono />
          </View>

          <Text style={styles.label}>รายละเอียดงาน</Text>
          <InputField
            placeholder="ระบุอาการ/สิ่งที่ต้องแก้ไข..."
            value={description}
            onChangeText={setDescription}
            multiline
            height={96}
          />

          <Text style={styles.label}>ผู้รับผิดชอบ</Text>
          <AssigneePicker members={members} value={assigneeIds} onChange={setAssigneeIds} disabled={saving} />

          <Text style={styles.label}>สถานะ</Text>
          <SelectField
            label="สถานะงาน"
            placeholder="เลือกสถานะ"
            value={status}
            onChange={(v) => setStatus(v as JobStatus)}
            options={STATUS_OPTIONS}
            renderTrigger={(open, selectedLabel) => (
              <Pressable onPress={open} style={styles.statusTrigger}>
                <View style={[styles.statusDot, { backgroundColor: getStatusMeta(colors)[status].color }]} />
                <Text style={styles.statusText}>{selectedLabel ?? "เลือกสถานะ"}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
              </Pressable>
            )}
          />

          <Text style={styles.label}>กำหนดเสร็จ</Text>
          <DatePickerField
            label="เลือกวันที่ต้องการให้เสร็จ"
            placeholder="ยังไม่ได้กำหนด"
            value={dueDate}
            onChange={setDueDate}
          />

          <Text style={styles.label}>รูปภาพหน้างาน</Text>
          <PhotoGallery
            photos={photos}
            onAdd={async (url) => {
              const created = await addJobPhoto(activeHotelId, jobId, url);
              setPhotos((prev) => [...prev, { id: created.id, url: created.url }]);
            }}
            onRemove={async (photo) => {
              if (!photo.id) return;
              await deleteJobPhoto(activeHotelId, jobId, photo.id);
              setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}: </Text>
      <Text style={[styles.metaValue, mono && styles.metaMono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  cancelLink: { color: colors.textSecondary, fontSize: 15, width: 60 },
  title: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  saveLink: { color: colors.signalBlue, fontSize: 15, fontWeight: "700", width: 60, textAlign: "right" },
  saveLinkDisabled: { color: colors.textTertiary },
  content: { padding: spacing.lg, paddingBottom: 60 },
  contentDesktop: { width: "100%", maxWidth: 640, alignSelf: "center" },
  metaCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metaCell: { width: "50%", flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  metaLabel: { fontSize: 12, color: colors.textSecondary },
  metaValue: { fontSize: 12, fontWeight: "700", color: colors.textPrimary, flexShrink: 1 },
  metaMono: { fontFamily: "Courier" },
  label: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  statusTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, fontSize: 15, color: colors.textPrimary },
});
