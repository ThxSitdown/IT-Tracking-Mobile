import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuthStore } from "../store/authStore";

/**
 * ดาวน์โหลดไฟล์ CSV จาก endpoint ที่ต้องแนบ token
 *
 * ต้องดึงเองด้วย fetch แทนการเปิด URL ตรงๆ เพราะ endpoint ต้องการ header Authorization
 * (เปิด URL เฉยๆ เบราว์เซอร์จะไม่แนบ token ไปให้ → ได้ 401)
 *
 * - เว็บ: สร้าง Blob แล้วสั่งดาวน์โหลดผ่านลิงก์ชั่วคราว
 * - มือถือ: เขียนไฟล์ลงเครื่องแล้วเปิดแผงแชร์ให้ผู้ใช้เลือกว่าจะส่งไปไหน
 */
export async function downloadCsv(url: string, filename: string): Promise<void> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`ดาวน์โหลดไม่สำเร็จ (${res.status})`);
  const csv = await res.text();

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // คืนหน่วยความจำที่ Blob จองไว้ — ถ้าไม่ revoke จะค้างจนกว่าจะปิดแท็บ
    URL.revokeObjectURL(objectUrl);
    return;
  }

  // expo-file-system ตั้งแต่ SDK 54 ใช้ API แบบ File/Paths แทน writeAsStringAsync เดิม
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "ส่งออกรายงาน CSV" });
  }
}
