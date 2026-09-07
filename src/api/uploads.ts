import { apiFetch } from "./client";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

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
export async function uploadPhoto(uri: string): Promise<{ url: string }> {
  const formData = new FormData();
  const filename = uri.split("/").pop() ?? "photo.jpg";
  // React Native's fetch รองรับ object รูปแบบนี้แทนไฟล์จริงได้เลย ไม่ต้องอ่านไฟล์เป็น base64 เอง
  formData.append("photo", { uri, name: filename, type: guessMimeType(uri) } as unknown as Blob);

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
