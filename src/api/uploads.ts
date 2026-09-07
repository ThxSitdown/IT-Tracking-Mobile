import { Platform } from "react-native";
import { apiFetch } from "./client";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

/** ชนิดไฟล์ที่ server ยอมรับ (ต้องตรงกับ MIME_TO_EXT ใน server/src/routes/uploads.routes.ts) */
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// เดาชนิดไฟล์จากนามสกุลใน URI แบบง่ายๆ พอสำหรับรูปที่มาจากกล้อง/คลังภาพของมือถือ
function guessMimeType(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// อัปโหลดรูปจาก URI ในเครื่อง (ที่ได้จาก expo-image-picker) ไปเก็บที่ server แล้วได้ path กลับมา
// (เป็น path สัมพัทธ์ เช่น "/uploads/files/xxxx.jpg" ไม่ใช่ URL เต็ม — server ไม่รู้ตัวเองว่าถูกเรียกผ่าน
//  URL ไหนจากข้างนอก จึงให้ฝั่งแอปเป็นคนเติม base URL ปัจจุบันเองตอนแสดงผล ผ่าน resolvePhotoUrl ด้านล่าง)
//
// วิธีแนบไฟล์ต่างกันระหว่างเว็บกับมือถือ ห้ามใช้แบบเดียวกัน:
//
//  - มือถือ (React Native): fetch รองรับ object { uri, name, type } แทนไฟล์จริงได้เลย
//    ไม่ต้องอ่านไฟล์เข้าหน่วยความจำเอง
//
//  - เว็บ: FormData ของเบราว์เซอร์รับได้เฉพาะ Blob/File จริงเท่านั้น
//    ถ้า append object แบบข้างบนเข้าไป เบราว์เซอร์จะแปลงเป็นข้อความ "[object Object]"
//    กลายเป็นฟิลด์ข้อความธรรมดา ไม่ใช่ไฟล์ — server จึงตอบว่า "ไม่พบไฟล์รูปภาพที่ส่งมา"
//    จึงต้องดึงข้อมูลจาก uri (blob:/data:) ออกมาเป็น Blob จริงก่อนเสมอ
export async function uploadPhoto(uri: string): Promise<{ url: string }> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    // uri บนเว็บเป็น blob:/data: ซึ่งไม่มีนามสกุลไฟล์ให้เดา จึงต้องอ่านชนิดจากตัว Blob เอง
    const type = blob.type || guessMimeType(uri);
    // Blob ที่ไม่มี type จะถูกส่งเป็น application/octet-stream แล้ว server ปฏิเสธ — ใส่ type ให้ชัดเจนเสมอ
    const typedBlob = blob.type ? blob : new Blob([blob], { type });
    formData.append("photo", typedBlob, `photo.${EXT_BY_MIME[type] ?? "jpg"}`);
  } else {
    const filename = uri.split("/").pop() ?? "photo.jpg";
    formData.append("photo", { uri, name: filename, type: guessMimeType(uri) } as unknown as Blob);
  }

  return apiFetch<{ url: string }>("/uploads/photo", { method: "POST", formData });
}

// แปลง path สัมพัทธ์ที่เก็บไว้ในฐานข้อมูล ให้เป็น URL เต็มที่ <Image> โหลดได้จริง
// เรียกใช้ตอน "แสดงผล" เท่านั้น — ค่าที่เก็บ/ส่งไป server ให้คงเป็น path สัมพัทธ์เดิมเสมอ
// (ย้าย server ไป domain ใหม่ก็ยังใช้รูปเก่าได้ ไม่ต้องแก้ข้อมูลในฐานข้อมูล)
export function resolvePhotoUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BASE_URL}${path}`;
}
