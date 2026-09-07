import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View, StyleSheet, FlatList, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps, useFocusEffect } from "@react-navigation/native";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { InputField } from "../components/InputField";
import { TicketCard } from "../components/TicketCard";
import { ErrorState } from "../components/ErrorState";
import { ApiError } from "../api/client";
import { Job, JobStatus, listJobs, listJobTaskTypes } from "../api/jobs";
import { configureNextAnimation, staggerDelay } from "../utils/animation";
import { FadeInView } from "../components/Motion";
import { useAuthStore } from "../store/authStore";
import { useResponsive } from "../hooks/useResponsive";
import { JobDetailPanel } from "./JobDetailScreen";

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "JobsTab">,
  NativeStackScreenProps<RootStackParamList>
>;

const FILTERS: { label: string; value: JobStatus | undefined }[] = [
  { label: "ทั้งหมด", value: undefined },
  { label: "กำลังทำ", value: "ON_PROCESS" },
  { label: "เสร็จสิ้น", value: "DONE" },
  { label: "ยกเลิก", value: "CANCELLED" },
];

export function AllJobsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<JobStatus | undefined>(undefined);
  // ตัวกรองเพิ่มเติม: ประเภทงาน และ "เฉพาะงานของฉัน" — ซ่อนไว้ใต้ปุ่มตัวกรองเพื่อไม่ให้แถบบนรก
  const [taskTypeFilter, setTaskTypeFilter] = useState<string | undefined>(undefined);
  const [mineOnly, setMineOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [taskTypes, setTaskTypes] = useState<{ taskType: string; count: number }[]>([]);
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // คำค้นที่ "นิ่งแล้ว" — แยกจาก search ที่เปลี่ยนทุกตัวอักษรที่พิมพ์ เพื่อไม่ให้ยิง API รัวๆ
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const pageRef = useRef(1);
  const activeHotelId = useAuthStore((s) => s.activeHotelId);
  const { isDesktop } = useResponsive();

  // หน่วง 400ms หลังหยุดพิมพ์ค่อยค้นหาจริง — ไม่ต้องกด Enter อีกต่อไป
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ตัวเลือก "ประเภทงาน" มาจากงานที่มีอยู่จริงในโรงแรมนี้ ไม่ได้ hard-code ไว้
  // (ทีมที่ไม่เคยมีงานประเภทหนึ่งเลย ก็ไม่ควรเห็นปุ่มกรองที่กดแล้วว่างเปล่า)
  useEffect(() => {
    if (!activeHotelId) return;
    listJobTaskTypes(activeHotelId).then(setTaskTypes).catch(() => {});
  }, [activeHotelId]);

  const activeFilterCount = (taskTypeFilter ? 1 : 0) + (mineOnly ? 1 : 0);

  async function load() {
    if (!activeHotelId) return;
    pageRef.current = 1;
    const data = await listJobs(activeHotelId, {
      status: statusFilter,
      search: debouncedSearch || undefined,
      taskType: taskTypeFilter,
      assignedTo: mineOnly ? "me" : undefined,
      page: 1,
    });
    setJobs(data.jobs);
    setTotal(data.total);
    setHasMore(data.hasMore);
  }

  // โหลดหน้าถัดไปต่อท้ายรายการเดิม (เลื่อนถึงท้ายรายการแล้วเรียก)
  async function loadMore() {
    if (!activeHotelId || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const next = pageRef.current + 1;
      const data = await listJobs(activeHotelId, {
        status: statusFilter,
        search: debouncedSearch || undefined,
        taskType: taskTypeFilter,
        assignedTo: mineOnly ? "me" : undefined,
        page: next,
      });
      pageRef.current = next;
      // กันงานซ้ำ เผื่อมีใบงานใหม่ถูกสร้างระหว่างที่กำลังเลื่อนดู (ทำให้ลำดับเลื่อน)
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        return [...prev, ...data.jobs.filter((j) => !seen.has(j.id))];
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      // โหลดหน้าถัดไปพลาดไม่ต้องล้างรายการที่มีอยู่ ผู้ใช้เลื่อนใหม่เพื่อลองอีกครั้งได้
    } finally {
      setLoadingMore(false);
    }
  }

  // แยก "โหลดไม่สำเร็จ" ออกจาก "ไม่พบงาน" ให้ชัด — ไม่งั้นตอน API ล่มผู้ใช้จะเห็นว่าไม่มีงานเลย ทั้งที่ข้อมูลยังอยู่ครบ
  function reload() {
    setLoading(true);
    setError(null);
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : null))
      .finally(() => setLoading(false));
  }

  useFocusEffect(
    useCallback(reload, [activeHotelId, statusFilter, debouncedSearch, taskTypeFilter, mineOnly])
  );

  function handlePressJob(id: string) {
    if (isDesktop) {
      setSelectedJobId(id);
    } else {
      navigation.navigate("JobDetail", { jobId: id });
    }
  }

  const listColumn = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>
          งานทั้งหมด{!loading && !error ? <Text style={styles.titleCount}>  {total}</Text> : null}
        </Text>
        <Text onPress={() => navigation.navigate("AddJob")} style={styles.addLink}>
          + เพิ่มงาน
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* ค้นหาอัตโนมัติหลังหยุดพิมพ์ ไม่ต้องกด Enter — ยังกด Enter เพื่อค้นทันทีได้อยู่ */}
        <InputField
          placeholder="ค้นหาเลขงาน, ห้อง..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={reload}
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.label}
              onPress={() => setStatusFilter(f.value)}
              style={[styles.chip, statusFilter === f.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}

          {/* ปุ่มเปิด/ปิดแผงตัวกรองเพิ่มเติม — โชว์จำนวนตัวกรองที่เปิดอยู่ เพื่อไม่ให้ลืมว่ากรองค้างไว้ */}
          <Pressable
            onPress={() => {
              configureNextAnimation();
              setFiltersOpen((v) => !v);
            }}
            style={[styles.chip, styles.filterToggle, activeFilterCount > 0 && styles.chipActive]}
          >
            <Ionicons
              name="options-outline"
              size={14}
              color={activeFilterCount > 0 ? "#fff" : colors.textSecondary}
            />
            <Text style={[styles.chipText, activeFilterCount > 0 && styles.chipTextActive]}>
              ตัวกรอง{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </Pressable>
        </View>

        {filtersOpen && (
          <FadeInView offsetY={-6} duration={200} style={styles.filterPanel}>
            <Pressable
              onPress={() => setMineOnly((v) => !v)}
              style={[styles.toggleRow, mineOnly && styles.toggleRowOn]}
            >
              <Ionicons
                name={mineOnly ? "checkbox" : "square-outline"}
                size={19}
                color={mineOnly ? colors.signalBlue : colors.textTertiary}
              />
              <Text style={styles.toggleText}>เฉพาะงานที่มอบหมายให้ฉัน</Text>
            </Pressable>

            <Text style={styles.filterGroupLabel}>ประเภทงาน</Text>
            {taskTypes.length === 0 ? (
              <Text style={styles.filterEmpty}>ยังไม่มีงานในระบบให้กรองตามประเภท</Text>
            ) : (
              <View style={styles.typeWrap}>
                <Pressable
                  onPress={() => setTaskTypeFilter(undefined)}
                  style={[styles.typeChip, !taskTypeFilter && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, !taskTypeFilter && styles.typeChipTextActive]}>
                    ทุกประเภท
                  </Text>
                </Pressable>
                {taskTypes.map((t) => {
                  const on = taskTypeFilter === t.taskType;
                  return (
                    <Pressable
                      key={t.taskType}
                      onPress={() => setTaskTypeFilter(on ? undefined : t.taskType)}
                      style={[styles.typeChip, on && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, on && styles.typeChipTextActive]}>
                        {t.taskType} ({t.count})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {activeFilterCount > 0 && (
              <Pressable
                onPress={() => {
                  setTaskTypeFilter(undefined);
                  setMineOnly(false);
                }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle-outline" size={15} color={colors.red} />
                <Text style={styles.clearText}>ล้างตัวกรอง</Text>
              </Pressable>
            )}
          </FadeInView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.signalBlue} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
          renderItem={({ item, index }) => (
            // ไล่ขึ้นทีละใบตามลำดับ ให้รู้สึกว่ารายการกำลังไหลเข้ามา แทนที่จะโผล่พรวดทั้งหน้า
            <FadeInView delay={staggerDelay(index)}>
              <TicketCard job={item} onPress={() => handlePressJob(item.id)} />
            </FadeInView>
          )}
          ListEmptyComponent={<Text style={styles.empty}>ไม่พบงาน</Text>}
          // โหลดหน้าถัดไปเมื่อเลื่อนใกล้ท้ายรายการ — ไม่ดึงทั้งหมดมาทีเดียวอีกต่อไป
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.signalBlue} />
            ) : !hasMore && jobs.length > 0 ? (
              <Text style={styles.listEnd}>แสดงครบทั้ง {total} งานแล้ว</Text>
            ) : null
          }
        />
      )}
    </>
  );

  if (!isDesktop) {
    return <SafeAreaView style={styles.screen}>{listColumn}</SafeAreaView>;
  }

  // เดสก์ท็อป: แสดงรายการงาน + รายละเอียดคู่กันแบบ master-detail แทนการ navigate ออกจากหน้า
  // (ใช้พื้นที่จอกว้างให้คุ้ม ไม่ต้องสลับหน้าไปมาเหมือนมือถือ)
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.splitRow}>
        <View style={styles.listCol}>{listColumn}</View>
        <View style={styles.detailCol}>
          {selectedJobId ? (
            <JobDetailPanel
              key={selectedJobId}
              jobId={selectedJobId}
              onDeleted={() => {
                setSelectedJobId(null);
                load();
              }}
              onChanged={load}
            />
          ) : (
            <View style={styles.emptyDetail}>
              <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyDetailText}>เลือกงานทางซ้ายเพื่อดูรายละเอียด</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cloud },
  splitRow: { flex: 1, flexDirection: "row" },
  listCol: { width: 380, borderRightWidth: 1, borderRightColor: colors.border },
  detailCol: { flex: 1 },
  emptyDetail: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyDetailText: { color: colors.textTertiary, fontSize: 13.5 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  titleCount: { fontSize: 13, fontWeight: "700", color: colors.textTertiary },
  listEnd: { textAlign: "center", fontSize: 11.5, color: colors.textTertiary, paddingVertical: spacing.lg },
  addLink: { color: colors.signalBlue, fontWeight: "700", fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.navyInk, borderColor: colors.navyInk },
  chipText: { fontSize: 12.5, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  filterToggle: { flexDirection: "row", alignItems: "center", gap: 5 },
  filterPanel: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  toggleRowOn: { backgroundColor: colors.cloud },
  toggleText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  filterGroupLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  filterEmpty: { fontSize: 12, color: colors.textTertiary, paddingHorizontal: 8, paddingBottom: 4 },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 4 },
  typeChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.cloud,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.signalBlue, borderColor: colors.signalBlue },
  typeChipText: { fontSize: 11.5, fontWeight: "600", color: colors.textSecondary },
  typeChipTextActive: { color: "#fff" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingTop: spacing.md,
  },
  clearText: { fontSize: 12, fontWeight: "700", color: colors.red },
  empty: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 40 },
});
