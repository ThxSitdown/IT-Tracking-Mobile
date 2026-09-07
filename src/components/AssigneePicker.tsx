import { useState } from "react";
import { Modal, Pressable, Text, View, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { MAX_ASSIGNEES_PER_JOB } from "../api/jobs";
import { configureNextAnimation } from "../utils/animation";

export type PickerMember = { id: string; name: string };

type Props = {
  members: PickerMember[];
  /** id ของคนที่ถูกเลือกอยู่ (เรียงตามลำดับที่เลือก) */
  value: string[];
  onChange: (ids: string[]) => void;
  /** ปิดการแก้ไข เช่น ระหว่างกำลังบันทึกขึ้น server */
  disabled?: boolean;
};

/**
 * เลือกผู้รับผิดชอบได้หลายคนต่อ 1 ใบงาน
 * แสดงเป็นชิปรายชื่อที่เลือกแล้ว (กด x เพื่อเอาออกได้ทันที) + ปุ่มเปิดรายการเพื่อติ๊กเลือก
 * ใช้ร่วมกันทั้งหน้าสร้างงาน หน้าแก้ไข และแผงรายละเอียด เพื่อให้พฤติกรรมเหมือนกันทุกที่
 */
export function AssigneePicker({ members, value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  const selected = value
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is PickerMember => !!m);

  function toggle(id: string) {
    configureNextAnimation();
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (value.length >= MAX_ASSIGNEES_PER_JOB) return;
      onChange([...value, id]);
    }
  }

  return (
    <>
      <View style={styles.chipWrap}>
        {selected.map((m) => (
          <View key={m.id} style={styles.chip}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{m.name.trim().charAt(0).toUpperCase() || "?"}</Text>
            </View>
            <Text style={styles.chipText} numberOfLines={1}>
              {m.name}
            </Text>
            {!disabled && (
              <Pressable onPress={() => toggle(m.id)} hitSlop={8} style={styles.chipRemove}>
                <Ionicons name="close" size={13} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        ))}

        <Pressable
          onPress={disabled ? undefined : () => setOpen(true)}
          style={({ pressed }) => [styles.addChip, pressed && !disabled && styles.addChipPressed]}
        >
          <Ionicons name="person-add-outline" size={14} color={colors.signalBlue} />
          <Text style={styles.addChipText}>
            {selected.length === 0 ? "เลือกผู้รับผิดชอบ" : "เพิ่มคน"}
          </Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* กันไม่ให้การกดในแผ่นชีตทะลุไปโดน backdrop จนปิดแผงทิ้ง — เลือกหลายคนติดๆ กันได้ */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>มอบหมายงานให้ ({value.length})</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.doneText}>เสร็จสิ้น</Text>
              </Pressable>
            </View>

            <FlatList
              data={members}
              keyExtractor={(m) => m.id}
              ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีสมาชิกในทีมที่มอบหมายงานได้</Text>}
              renderItem={({ item }) => {
                const checked = value.includes(item.id);
                // เต็มโควตาแล้วจะกดเพิ่มคนใหม่ไม่ได้ แต่ยังกดเอาคนที่เลือกไว้ออกได้เสมอ
                const blocked = !checked && value.length >= MAX_ASSIGNEES_PER_JOB;
                return (
                  <Pressable
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                    onPress={() => toggle(item.id)}
                    disabled={blocked}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxOn, blocked && styles.checkboxOff]}>
                      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.optionText, blocked && styles.optionTextBlocked]}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />

            {value.length >= MAX_ASSIGNEES_PER_JOB && (
              <Text style={styles.limitNote}>มอบหมายได้สูงสุด {MAX_ASSIGNEES_PER_JOB} คนต่อ 1 ใบงาน</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    maxWidth: 220,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.signalBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  chipText: { fontSize: 12.5, fontWeight: "600", color: colors.textPrimary, flexShrink: 1 },
  chipRemove: { padding: 1 },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.signalBlue,
  },
  addChipPressed: { opacity: 0.6 },
  addChipText: { fontSize: 12.5, fontWeight: "700", color: colors.signalBlue },
  backdrop: { flex: 1, backgroundColor: "rgba(11,15,29,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingBottom: 34,
    maxHeight: "65%",
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  doneText: { fontSize: 14, fontWeight: "700", color: colors.signalBlue },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionPressed: { backgroundColor: colors.cloud },
  optionText: { fontSize: 15, color: colors.textPrimary },
  optionTextBlocked: { color: colors.textTertiary },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.signalBlue, borderColor: colors.signalBlue },
  checkboxOff: { opacity: 0.4 },
  empty: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  limitNote: {
    fontSize: 11.5,
    color: colors.textTertiary,
    textAlign: "center",
    paddingTop: spacing.md,
  },
});
