import { Modal, Pressable, Text, View, StyleSheet, FlatList } from "react-native";
import { useState, ReactNode } from "react";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

type Option = { label: string; value: string };

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  dark?: boolean;
  /** ใส่ถ้าอยากคุมหน้าตาปุ่มที่กดเปิดเอง (เช่น ให้ดูเป็นแถวข้อมูลธรรมดาแทนกล่อง input) — ไม่ใส่จะใช้กล่องมาตรฐาน */
  renderTrigger?: (open: () => void, selectedLabel: string | null) => ReactNode;
};

// เลือกใช้ Modal + FlatList ธรรมดาแทนไลบรารี picker แยก — ไม่ต้องพึ่ง native module เพิ่ม
// (กันปัญหาเวอร์ชันไม่ตรงกับ Expo SDK ซ้ำแบบที่เจอตอนตั้งค่าโปรเจกต์ครั้งแรก) และคุมสไตล์ให้ตรงกับดีไซน์ได้เต็มที่
export function SelectField({ label, placeholder, value, onChange, options, dark, renderTrigger }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(() => setOpen(true), selected?.label ?? null)
      ) : (
        <Pressable style={[styles.field, dark && styles.fieldDark]} onPress={() => setOpen(true)}>
          <Text
            style={[
              styles.fieldText,
              !selected && styles.placeholder,
              dark && { color: selected ? "#fff" : "#8890A6" },
            ]}
          >
            {selected ? selected.label : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={16} color={dark ? "#8890A6" : colors.textTertiary} />
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                  {item.value === value && <Ionicons name="checkmark" size={18} color={colors.signalBlue} />}
                </Pressable>
              )}
            />
          </View>
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  fieldDark: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" },
  fieldText: { fontSize: 15, color: colors.textPrimary },
  placeholder: { color: colors.textTertiary },
  backdrop: { flex: 1, backgroundColor: "rgba(11,15,29,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingBottom: 34,
    maxHeight: "60%",
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionText: { fontSize: 15, color: colors.textPrimary },
});
