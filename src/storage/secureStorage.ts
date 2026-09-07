// Wrapper รอบ expo-secure-store — บนเว็บ native module ของ SecureStore ว่างเปล่า (ไม่รองรับ)
// เรียกแล้วจะ throw ทันที จึง fallback ไปใช้ localStorage แทนเวลารันบนเว็บ (เช่น `expo start` แล้วกด `w`)
// หมายเหตุ: localStorage ไม่ได้เข้ารหัสเหมือน SecureStore ใช้พอสำหรับดูตัวอย่างบนเบราว์เซอร์ ไม่เหมาะกับ production จริงบนเว็บ
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
