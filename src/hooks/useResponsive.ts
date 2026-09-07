// จุดเดียวที่ตัดสินว่าจอนี้ถือเป็น "เดสก์ท็อป" หรือ "มือถือ" — ใช้ทั้งแอปเพื่อสลับ layout
// (sidebar แทน bottom tab bar, grid หลายคอลัมน์, การ์ดฟอร์มจำกัดความกว้าง ฯลฯ)
import { useWindowDimensions } from "react-native";

export const DESKTOP_BREAKPOINT = 900;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  return { width, height, isDesktop };
}
