// การตั้งค่าส่วนตัวที่เก็บไว้ในเครื่อง (ไม่ผูกกับบัญชี/เซิร์ฟเวอร์) — ใช้ storage ตัวเดียวกับ token
// เพื่อให้ทำงานได้ทั้งบนมือถือ (SecureStore) และบนเว็บ (localStorage) โดยอัตโนมัติ
import { create } from "zustand";
import * as storage from "../storage/secureStorage";

const KEYS = { pushEnabled: "pref_push_enabled", themeMode: "pref_theme_mode" };

export type ThemeMode = "system" | "light" | "dark";

const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

type PrefsState = {
  pushEnabled: boolean;
  themeMode: ThemeMode;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setPushEnabled: (value: boolean) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

export const usePrefsStore = create<PrefsState>((set) => ({
  pushEnabled: true, // ค่าเริ่มต้น: เปิดแจ้งเตือน (ผู้ใช้ยังต้องกดอนุญาตสิทธิ์ระบบอีกชั้นอยู่ดี)
  themeMode: "system", // ตามเครื่อง — ค่าเริ่มต้นที่ผู้ใช้ส่วนใหญ่คาดหวัง
  isHydrated: false,

  hydrate: async () => {
    const [storedPush, storedTheme] = await Promise.all([
      storage.getItemAsync(KEYS.pushEnabled),
      storage.getItemAsync(KEYS.themeMode),
    ]);
    set({
      pushEnabled: storedPush === null ? true : storedPush === "true",
      // กันค่าเพี้ยนจาก storage (แก้มือ/ค้างจากเวอร์ชันเก่า) ไม่ให้ธีมพังทั้งแอป
      themeMode: THEME_MODES.includes(storedTheme as ThemeMode) ? (storedTheme as ThemeMode) : "system",
      isHydrated: true,
    });
  },

  setPushEnabled: async (value) => {
    await storage.setItemAsync(KEYS.pushEnabled, String(value));
    set({ pushEnabled: value });
  },

  setThemeMode: async (mode) => {
    await storage.setItemAsync(KEYS.themeMode, mode);
    set({ themeMode: mode });
  },
}));
