import { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { showDialog } from "../utils/dialog";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { StatusBadge } from "../components/StatusBadge";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { DatePickerField } from "../components/DatePickerField";
import { PhotoGallery } from "../components/PhotoGallery";
import { ErrorState } from "../components/ErrorState";
import { AssigneePicker } from "../components/AssigneePicker";
import { FadeInView } from "../components/Motion";
import { configureNextAnimation, staggerDelay } from "../utils/animation";
import { ApiError } from "../api/client";
import {
  addJobPhoto,
  addNote,
  addSubtask,
  deleteJob,
  deleteJobPhoto,
  getJob,
  setJobAssignees,
  toggleSubtask,
  updateJob,
} from "../api/jobs";
import { AssignableMember, listAssignableMembers } from "../api/hotels";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetail">;

type JobDetailData = {
  id: string;
  code: string;
  description: string;
  requestedBy: string;
  room: string | null;
  property: string | null;
  taskType: string;
  status: "ON_PROCESS" | "DONE" | "CANCELLED";
  dueDate: string | null;
  photos: { id: string; url: string; createdAt: string }[];
  createdAt: string;
  assignees: { id: string; name: string }[];
  subtasks: { id: string; title: string; done: boolean }[];
  notes: { id: string; body: string; createdAt: string; author: { name: string } }[];
};

function formatDueDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

// เนื้อหารายละเอียดงานล้วนๆ แยกออกมาจาก "หน้าจอ" เพื่อให้ใช้ซ้ำได้ 2 ที่:
// 1) JobDetailScreen ด้านล่าง — เต็มจอ ผ่าน Stack (มือถือ และเดสก์ท็อปตอนไม่ได้อยู่ใน split view)
// 2) AllJobsScreen บนจอกว้าง — แสดงคู่กับรายการงอนแบบ master-detail โดยไม่ต้อง navigate ออกจากหน้า
// onDeleted แทนที่ navigation.goBack() เดิม เพื่อให้ผู้เรียกตัดสินใจเองว่า "ปิด" แปลว่าอะไร (goBack บนมือถือ, เคลียร์ selection บนเดสก์ท็อป)
export function JobDetailPanel({
  jobId,
  onDeleted,
  onChanged,
}: {
  jobId: string;
  onDeleted: () => void;
  /** เรียกทุกครั้งที่ข้อมูลงานนี้โหลด/เปลี่ยนสำเร็จ — ใช้ตอนแสดงคู่กับรายการงอน (desktop split view)
   *  เพื่อให้รายการฝั่งซ้ายซิงค์ตามสถานะล่าสุดโดยไม่ต้องออกจากหน้า (ไม่มี navigation focus event มาช่วยรีเฟรชให้เหมือนมือถือ) */
  onChanged?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeHotelId = useAuthStore((s) => s.activeHotelId)!;
  const activeHotelRole = useAuthStore((s) => s.activeHotelRole);
  // ใช้ hook แทนการรับ navigation มาเป็น prop เพราะ component นี้ถูกใช้ 2 แบบ
  // (เต็มจอผ่าน Stack และฝังใน AllJobsScreen บนเดสก์ท็อป) — ทั้งสองแบบอยู่ใต้ NavigationContainer เหมือนกัน
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [job, setJob] = useState<JobDetailData | null>(null);
  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = (await getJob(activeHotelId, jobId)) as JobDetailData;
    setJob(data);
    onChanged?.();
  }

  function reload() {
    setLoading(true);
    setError(null);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : null))
      .finally(() => setLoading(false));
  }

  useFocusEffect(useCallback(reload, [jobId]));

  // โหลดรายชื่อทีมไว้เติมตัวเลือก "มอบหมายงานให้" — ไม่ต้องรอทุกครั้งที่เปิด modal
  useEffect(() => {
    listAssignableMembers(activeHotelId).then(setMembers).catch(() => {});
  }, [activeHotelId]);

  async function handleMarkDone() {
    await updateJob(activeHotelId, jobId, { status: "DONE" });
    load();
  }

  function handleCancelJob() {
    showDialog("ยกเลิกงานนี้?", "งานจะถูกทำเครื่องหมายเป็น 'ยกเลิก' — ยืนยันไหม?", [
      { text: "ไม่ยกเลิก", style: "cancel" },
      {
        text: "ยกเลิกงาน",
        style: "destructive",
        onPress: async () => {
          await updateJob(activeHotelId, jobId, { status: "CANCELLED" });
          load();
        },
      },
    ]);
  }

  function handleDeleteJob() {
    showDialog(
      "ลบงานนี้ถาวร?",
      `งาน #${job?.code} รวมถึงเช็คลิสต์และบันทึกทั้งหมดจะถูกลบ กู้คืนไม่ได้ — ยืนยันไหม?`,
      [
        { text: "ไม่ลบ", style: "cancel" },
        {
          text: "ลบงาน",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteJob(activeHotelId, jobId);
              onDeleted();
            } catch {
              showDialog("ลบไม่สำเร็จ", "ลองใหม่อีกครั้ง");
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  // แผงนี้บันทึกทันทีทีละอย่าง (ไม่มีปุ่ม "บันทึก" รวม) — เปลี่ยนผู้รับผิดชอบก็ยิงขึ้น server เลย
  // อัปเดตหน้าจอไว้ก่อนแล้วค่อยยิง เพื่อให้ชิปขึ้น/หายทันทีที่กด ไม่ต้องรอเน็ตรอบหนึ่ง
  // ถ้าพลาดก็โหลดค่าจริงจาก server กลับมาทับ ผู้ใช้จะไม่เข้าใจผิดว่าบันทึกไปแล้ว
  async function handleSetAssignees(ids: string[]) {
    const previous = job?.assignees ?? [];
    setJob((prev) =>
      prev
        ? { ...prev, assignees: ids.map((id) => ({ id, name: members.find((m) => m.id === id)?.name ?? "" })) }
        : prev
    );
    try {
      await setJobAssignees(activeHotelId, jobId, ids);
      load();
    } catch {
      setJob((prev) => (prev ? { ...prev, assignees: previous } : prev));
      showDialog("บันทึกไม่สำเร็จ", "เปลี่ยนผู้รับผิดชอบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handleSetDueDate(iso: string | null) {
    await updateJob(activeHotelId, jobId, { dueDate: iso ? new Date(iso).toISOString() : null });
    load();
  }

  // ในหน้ารายละเอียด รูปถูกบันทึกทันทีที่เพิ่ม/ลบ (ไม่มีปุ่มบันทึกรวม) จึงยิง API แล้วโหลดใหม่เลย
  async function handleAddPhoto(url: string) {
    await addJobPhoto(activeHotelId, jobId, url);
    await load();
  }

  async function handleRemovePhoto(photo: { id: string | null }) {
    if (!photo.id) return;
    await deleteJobPhoto(activeHotelId, jobId, photo.id);
    await load();
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    await addSubtask(activeHotelId, jobId, newSubtask.trim());
    setNewSubtask("");
    load();
  }

  async function handleToggleSubtask(subtaskId: string) {
    configureNextAnimation(180);
    await toggleSubtask(activeHotelId, jobId, subtaskId);
    load();
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    await addNote(activeHotelId, jobId, newNote.trim());
    setNewNote("");
    load();
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.signalBlue} />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  const doneCount = job.subtasks.filter((s) => s.done).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FadeInView style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.code}>#{job.code}</Text>
            <Text style={styles.meta}>แจ้งเมื่อ {new Date(job.createdAt).toLocaleString("th-TH")}</Text>
          </View>
          <View style={styles.headActions}>
            <StatusBadge status={job.status} />
            <Pressable onPress={() => navigation.navigate("EditJob", { jobId })} style={styles.editBtn} hitSlop={6}>
              <Ionicons name="create-outline" size={18} color={colors.signalBlue} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.description}>{job.description}</Text>
        <View style={styles.metaGrid}>
          <MetaItem label="แจ้งโดย" value={job.requestedBy} />
          <MetaItem label="ห้อง / โซน" value={`${job.room ?? "-"} · ${job.property ?? "-"}`} />
          <MetaItem label="ประเภทงาน" value={job.taskType} />
        </View>
      </FadeInView>

      {/* ผู้รับผิดชอบ — ทุกคนในทีมเพิ่ม/เอาออกได้ ไม่ใช่แค่ Admin และใส่ได้มากกว่า 1 คน */}
      <View style={styles.assigneeBlock}>
        <View style={styles.assigneeHead}>
          <Ionicons name="person-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoRowLabel}>ผู้รับผิดชอบ</Text>
        </View>
        <AssigneePicker members={members} value={job.assignees.map((a) => a.id)} onChange={handleSetAssignees} />
      </View>

      {/* วันที่ต้องการให้เสร็จ — แตะเพื่อตั้ง/แก้ไข/ล้างได้ */}
      <DatePickerField
        label="วันที่ต้องการให้เสร็จ"
        placeholder="ยังไม่ได้กำหนด"
        value={job.dueDate ? job.dueDate.slice(0, 10) : null}
        onChange={handleSetDueDate}
        renderTrigger={(open) => (
          <Pressable onPress={open} style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="calendar-outline" size={22} color={colors.textSecondary} />
              <View>
                <Text style={styles.infoRowLabel}>วันที่ต้องการให้เสร็จ</Text>
                <Text style={styles.infoRowValue}>{job.dueDate ? formatDueDate(job.dueDate) : "ยังไม่ได้กำหนด"}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      />

      <Text style={styles.sectionTitle}>รูปภาพหน้างาน</Text>
      <PhotoGallery photos={job.photos ?? []} onAdd={handleAddPhoto} onRemove={handleRemovePhoto} />

      <Text style={styles.sectionTitle}>เช็คลิสต์ย่อย ({doneCount}/{job.subtasks.length})</Text>
      <View style={styles.card}>
        {job.subtasks.map((s) => (
          <Pressable key={s.id} onPress={() => handleToggleSubtask(s.id)} style={styles.subtaskRow}>
            <View style={[styles.checkbox, s.done && styles.checkboxDone]}>
              {s.done && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.subtaskText, s.done && styles.subtaskDone]}>{s.title}</Text>
          </Pressable>
        ))}
        <InputField
          placeholder="เพิ่มรายการเช็คลิสต์..."
          value={newSubtask}
          onChangeText={setNewSubtask}
          onSubmitEditing={handleAddSubtask}
          returnKeyType="done"
          style={{ marginTop: job.subtasks.length ? spacing.sm : 0 }}
        />
      </View>

      <Text style={styles.sectionTitle}>บันทึกงาน (Notes)</Text>
      {job.notes.map((n, i) => (
        <FadeInView key={n.id} delay={staggerDelay(i, 40)} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.noteAuthor}>{n.author.name}</Text>
            <Text style={styles.noteTime}>{new Date(n.createdAt).toLocaleTimeString("th-TH")}</Text>
          </View>
          <Text style={styles.noteBody}>{n.body}</Text>
        </FadeInView>
      ))}
      <InputField
        placeholder="เขียนบันทึกเพิ่มเติม..."
        value={newNote}
        onChangeText={setNewNote}
        onSubmitEditing={handleAddNote}
        returnKeyType="send"
      />

      {job.status !== "DONE" && job.status !== "CANCELLED" && (
        <View style={styles.actionRow}>
          <PrimaryButton title="ยกเลิกงาน" onPress={handleCancelJob} variant="ghost" style={{ flex: 1 }} />
          <PrimaryButton title="เสร็จสิ้นงาน" onPress={handleMarkDone} variant="blue" style={{ flex: 1 }} />
        </View>
      )}

      {/* ลบถาวรได้เฉพาะ Admin ของโรงแรม — แยกออกจากปุ่มยกเลิก/เสร็จสิ้นชัดเจน กันการกดพลาด */}
      {activeHotelRole === "ADMIN" && (
        <Pressable onPress={handleDeleteJob} disabled={deleting} style={styles.deleteLink}>
          <Ionicons name="trash-outline" size={15} color={colors.red} />
          <Text style={styles.deleteLinkText}>{deleting ? "กำลังลบ..." : "ลบงานนี้ถาวร"}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

export function JobDetailScreen({ route, navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.screen}>
      <JobDetailPanel jobId={route.params.jobId} onDeleted={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={{ width: "48%", marginBottom: 8 }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cloud },
  content: { padding: spacing.lg, paddingBottom: 60, gap: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  editBtn: { padding: 2 },
  code: { fontFamily: "Courier", fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  description: { fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginVertical: 14 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metaLabel: { fontSize: 11, color: colors.textTertiary },
  metaValue: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  infoRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  assigneeBlock: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  assigneeHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  infoRowLabel: { fontSize: 11, color: colors.textTertiary },
  infoRowValue: { fontSize: 13.5, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 8, marginTop: 6 },
  subtaskRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: colors.green, borderColor: colors.green },
  subtaskText: { fontSize: 13.5, color: colors.textPrimary, flex: 1 },
  subtaskDone: { color: colors.textTertiary, textDecorationLine: "line-through" },
  noteAuthor: { fontSize: 12.5, fontWeight: "700", color: colors.textPrimary },
  noteTime: { fontSize: 11, color: colors.textTertiary },
  noteBody: { fontSize: 13, color: colors.textPrimary, marginTop: 6, lineHeight: 19 },
  actionRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  deleteLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md, marginTop: spacing.xs },
  deleteLinkText: { color: colors.red, fontSize: 13, fontWeight: "700" },
});
