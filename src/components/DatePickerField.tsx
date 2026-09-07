import { useState, ReactNode } from "react";
import { Modal, Pressable, Text, View, StyleSheet } from "react-native";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  label: string;
  placeholder: string;
  value: string | null; // ISO date string เช่น "2026-08-20" หรือ null ถ้ายังไม่ตั้ง
  onChange: (value: string | null) => void;
  dark?: boolean;
  /** ใส่ถ้าอยากคุมหน้าตาปุ่มที่กดเปิดเอง — ไม่ใส่จะใช้กล่อง input มาตรฐาน */
  renderTrigger?: (open: () => void, displayText: string | null) => ReactNode;
};

const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_TH[m - 1]} ${y + 543}`; // แสดงเป็น พ.ศ. ให้คุ้นตาผู้ใช้ไทย
}

// ปฏิทินเลือกวันที่แบบกำหนดเอง — ใช้แค่ View/Pressable ล้วนๆ ไม่พึ่ง native date picker
// เพื่อไม่เพิ่มความเสี่ยงเรื่องเวอร์ชัน native module ไม่ตรงกับ Expo SDK ซ้ำอีก
export function DatePickerField({ label, placeholder, value, onChange, dark, renderTrigger }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? new Date(value) : new Date()));

  function openPicker() {
    setViewDate(value ? new Date(value) : new Date());
    setOpen(true);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayIso = toIso(new Date());
  const displayText = value ? formatDisplay(value) : null;

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openPicker, displayText)
      ) : (
        <Pressable style={[styles.field, dark && styles.fieldDark]} onPress={openPicker}>
          <Ionicons name="calendar-outline" size={18} color={dark ? "#8890A6" : colors.textTertiary} />
          <Text
            style={[styles.fieldText, !value && styles.placeholder, dark && { color: value ? "#fff" : "#8890A6" }]}
          >
            {displayText ?? placeholder}
          </Text>
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>

            <View style={styles.monthRow}>
              <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={styles.monthNavBtn}>
                <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.monthLabel}>
                {MONTHS_TH[month]} {year + 543}
              </Text>
              <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} style={styles.monthNavBtn}>
                <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS_TH.map((w) => (
                <Text key={w} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day === null) return <View key={i} style={styles.cell} />;
                const iso = toIso(new Date(year, month, day));
                const isSelected = iso === value;
                const isToday = iso === todayIso;
                return (
                  <Pressable
                    key={i}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                    onPress={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        isToday && styles.cellTextToday,
                        isSelected && styles.cellTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {value && (
              <Pressable
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>ล้างวันที่</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  field: {
    height: 54,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  fieldDark: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" },
  fieldText: { fontSize: 15, color: colors.textPrimary },
  placeholder: { color: colors.textTertiary },
  backdrop: { flex: 1, backgroundColor: "rgba(11,15,29,0.5)", justifyContent: "center", alignItems: "center" },
  sheet: { width: "88%", backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg },
  sheetTitle: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: spacing.md },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  monthNavBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  weekdayRow: { flexDirection: "row", marginBottom: 4 },
  weekdayText: { flex: 1, textAlign: "center", fontSize: 11.5, fontWeight: "700", color: colors.textTertiary },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellSelected: { backgroundColor: colors.signalBlue, borderRadius: 999 },
  cellText: { fontSize: 13.5, color: colors.textPrimary },
  cellTextToday: { color: colors.signalBlue, fontWeight: "700" },
  cellTextSelected: { color: "#fff", fontWeight: "700" },
  clearBtn: { alignItems: "center", marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  clearBtnText: { color: colors.red, fontSize: 13, fontWeight: "700" },
});
