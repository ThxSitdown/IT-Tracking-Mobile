// เก็บสถานะ login และ token ไว้ที่เดียวกลางแอป ใช้ SecureStore เก็บ token
// (SecureStore เข้ารหัสข้อมูลในเครื่อง ปลอดภัยกว่า AsyncStorage ธรรมดา — เหมาะกับข้อมูลอ่อนไหวอย่าง token)
// บนเว็บ SecureStore ใช้ไม่ได้ — secureStorage.ts จะ fallback ไป localStorage ให้อัตโนมัติ
import { create } from "zustand";
import * as SecureStore from "../storage/secureStorage";

type User = { id: string; name: string; email: string };
export type HotelRole = "ADMIN" | "TECHNICIAN";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  activeHotelId: string | null;
  activeHotelRole: HotelRole | null; // บทบาทของผู้ใช้ "ในโรงแรมที่กำลังใช้งานอยู่" — ใช้ซ่อน/โชว์ปุ่มที่ Admin เท่านั้นทำได้
  isHydrated: boolean; // true เมื่อโหลด token จาก storage เสร็จแล้วตอนเปิดแอป
  setSession: (data: { accessToken: string; refreshToken: string; user: User }) => Promise<void>;
  /** อัปเดต token คู่ใหม่หลัง refresh + เขียนลงเครื่องด้วย (server หมุน refresh token ทุกครั้งที่ใช้) */
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  /** อัปเดตข้อมูลผู้ใช้ + เก็บลงเครื่องด้วย — ใช้ตอนดึงโปรไฟล์ล่าสุดจาก /auth/me มาเติม */
  setUser: (user: User) => Promise<void>;
  setActiveHotel: (hotelId: string, role: HotelRole) => Promise<void>;
  clearActiveHotel: () => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

const KEYS = {
  access: "access_token",
  refresh: "refresh_token",
  hotel: "active_hotel_id",
  hotelRole: "active_hotel_role",
  user: "auth_user",
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  activeHotelId: null,
  activeHotelRole: null,
  isHydrated: false,

  setSession: async ({ accessToken, refreshToken, user }) => {
    await SecureStore.setItemAsync(KEYS.access, accessToken);
    await SecureStore.setItemAsync(KEYS.refresh, refreshToken);
    // เก็บโปรไฟล์ลงเครื่องด้วย ไม่งั้นพอเปิดแอปใหม่ hydrate จะได้แต่ token
    // แล้วหน้าโปรไฟล์จะโชว์ "??" กับ "-" เพราะ user เป็น null
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
    set({ accessToken, refreshToken, user });
  },

  // สำคัญ: ต้องเขียนลง storage ด้วย ไม่ใช่แค่ set ใน memory
  // เพราะ server เพิกถอน refresh token เก่าทันทีที่ใช้ (rotation แบบใช้ได้ครั้งเดียว)
  // ถ้าเก็บแต่ใน memory พอปิดแอปแล้วเปิดใหม่ จะได้ token ที่ตายแล้วจาก storage → ถูกเด้งออกให้ล็อกอินใหม่
  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync(KEYS.access, accessToken);
    await SecureStore.setItemAsync(KEYS.refresh, refreshToken);
    set({ accessToken, refreshToken });
  },

  setUser: async (user) => {
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
    set({ user });
  },

  setActiveHotel: async (hotelId, role) => {
    await SecureStore.setItemAsync(KEYS.hotel, hotelId);
    await SecureStore.setItemAsync(KEYS.hotelRole, role);
    set({ activeHotelId: hotelId, activeHotelRole: role });
  },

  // ใช้ตอน "สลับโรงแรม" — ล้างแค่โรงแรมที่ active ไม่ใช่การออกจากระบบทั้งบัญชี
  // พอ activeHotelId เป็น null, RootNavigator จะสลับกลับไปหน้า Join Property ให้อัตโนมัติ
  clearActiveHotel: async () => {
    await SecureStore.deleteItemAsync(KEYS.hotel);
    await SecureStore.deleteItemAsync(KEYS.hotelRole);
    set({ activeHotelId: null, activeHotelRole: null });
  },

  hydrate: async () => {
    const [accessToken, refreshToken, activeHotelId, activeHotelRole, storedUser] = await Promise.all([
      SecureStore.getItemAsync(KEYS.access),
      SecureStore.getItemAsync(KEYS.refresh),
      SecureStore.getItemAsync(KEYS.hotel),
      SecureStore.getItemAsync(KEYS.hotelRole),
      SecureStore.getItemAsync(KEYS.user),
    ]);

    // ข้อมูลที่เก็บไว้อาจพังได้ (แก้มือ/ค้างจากเวอร์ชันเก่า) — พังแล้วต้องไม่ทำให้เปิดแอปไม่ได้
    let user: User | null = null;
    if (storedUser) {
      try {
        user = JSON.parse(storedUser) as User;
      } catch {
        await SecureStore.deleteItemAsync(KEYS.user);
      }
    }

    set({
      accessToken,
      refreshToken,
      user,
      activeHotelId,
      activeHotelRole: activeHotelRole as HotelRole | null,
      isHydrated: true,
    });
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.access),
      SecureStore.deleteItemAsync(KEYS.refresh),
      SecureStore.deleteItemAsync(KEYS.hotel),
      SecureStore.deleteItemAsync(KEYS.hotelRole),
      SecureStore.deleteItemAsync(KEYS.user),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, activeHotelId: null, activeHotelRole: null });
    // แจ้ง server ให้เพิกถอน refresh token นี้ด้วย ไม่ปล่อยให้ยังใช้ต่อได้ฝั่งเซิร์ฟเวอร์
    // เรียก fetch ตรงๆ แทนการ import apiFetch เพื่อเลี่ยง circular import (client.ts ก็ import store นี้อยู่แล้ว)
    if (refreshToken) {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
      fetch(`${baseUrl}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  },
}));
