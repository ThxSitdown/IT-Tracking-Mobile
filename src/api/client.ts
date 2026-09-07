// ตัวกลางเรียก API ทุกจุดของแอปผ่านไฟล์นี้ที่เดียว — แนบ token, จัดการ error, และ refresh token ให้อัตโนมัติ
import { useAuthStore } from "../store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// พิมพ์ค่านี้ไว้ใน log ตอนแอปเริ่มทำงาน เพื่อเช็คง่ายๆ ว่าแอปมองเห็น URL ไหนอยู่
// เปิดดูได้จากหน้าต่างที่รัน `npm start` (ฝั่ง terminal) หรือ log ในแอป Expo Go
console.log("[IT Tracking] API base URL:", BASE_URL);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  skipAuth?: boolean;
  /** ใช้ตอนอัปโหลดไฟล์ — ส่ง FormData ตรงๆ โดยไม่ JSON.stringify และไม่ตั้ง Content-Type เอง
   *  (ปล่อยให้ fetch ใส่ multipart boundary ให้อัตโนมัติ ถ้าตั้ง header เองจะพังเพราะ boundary ไม่ตรง) */
  formData?: FormData;
};

async function rawFetch(path: string, options: FetchOptions = {}) {
  const { accessToken } = useAuthStore.getState();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.formData ? {} : { "Content-Type": "application/json" }),
        ...(options.skipAuth || !accessToken ? {} : { Authorization: `Bearer ${accessToken}` }),
      },
      body: options.formData ?? (options.body ? JSON.stringify(options.body) : undefined),
    });
    return res;
  } catch (networkError) {
    // fetch() เข้าไม่ถึงเซิร์ฟเวอร์เลย (คนละวงเน็ต, server ไม่ได้รัน, IP/URL ผิด, ไฟร์วอลล์กัน ฯลฯ)
    // แยก error นี้ออกจาก error ที่เซิร์ฟเวอร์ตอบกลับมาจริงๆ ให้ผู้ใช้เห็นสาเหตุชัดเจนกว่าเดิม
    console.log("[IT Tracking] Network error calling", BASE_URL + path, networkError);
    throw new ApiError(
      `เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (${BASE_URL}) — ตรวจสอบว่า server รันอยู่, มือถือกับคอมอยู่ WiFi วงเดียวกัน, และ EXPO_PUBLIC_API_URL ถูกต้อง`,
      0
    );
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return false;

  const res = await rawFetch("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
  });
  if (!res.ok) return false;

  const data = await res.json();
  // ต้องเก็บลงเครื่องทั้งคู่ ไม่ใช่แค่ใน memory — server หมุน refresh token ทุกครั้งที่ใช้
  // (ตัวเก่าถูกเพิกถอนทันที) ถ้าไม่เขียนทับของเดิมใน storage พอเปิดแอปรอบหน้าจะหลุดล็อกอิน
  await setTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  // ถ้า access token หมดอายุ (401) ลอง refresh แล้วยิงซ้ำหนึ่งครั้ง — ผู้ใช้ไม่รู้สึกสะดุด
  if (res.status === 401 && !options.skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await rawFetch(path, options);
    } else {
      await useAuthStore.getState().logout();
      throw new ApiError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? "เกิดข้อผิดพลาด", res.status);
  }
  return data as T;
}
