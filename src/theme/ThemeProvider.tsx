import { createContext, useContext, useMemo, ReactNode } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { ThemeColors, darkColors, lightColors } from "./tokens";
import { usePrefsStore } from "../store/prefsStore";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  mode: "system",
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = usePrefsStore((s) => s.themeMode);
  // ธีมของระบบปฏิบัติการ — เปลี่ยนเองได้ตลอดเวลา (เช่นตั้งเวลาสลับกลางคืน) hook นี้จะ re-render ให้อัตโนมัติ
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
    return { colors: isDark ? darkColors : lightColors, isDark, mode };
  }, [mode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * สร้าง StyleSheet ใหม่เมื่อธีมเปลี่ยน
 *
 * เขียน stylesheet เป็นฟังก์ชันที่รับชุดสีเข้าไป แล้ว hook นี้จะ memo ไว้ให้ตามธีมปัจจุบัน
 * (ตั้งชื่อพารามิเตอร์ว่า `colors` เหมือนเดิม โค้ดใน stylesheet จึงไม่ต้องแก้อะไรเลย)
 *
 * ```ts
 * const createStyles = (colors: ThemeColors) => StyleSheet.create({ ... });
 * // ในคอมโพเนนต์:
 * const styles = useThemedStyles(createStyles);
 * ```
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
