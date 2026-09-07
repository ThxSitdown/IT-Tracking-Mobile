import { apiFetch } from "./client";

type AuthResponse = {
  user: { id: string; name: string; email: string };
  accessToken: string;
  refreshToken: string;
};

export function registerRequest(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: { name, email, password },
    skipAuth: true,
  });
}

export function loginRequest(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    skipAuth: true,
  });
}

export type MeResponse = {
  id: string;
  name: string;
  email: string;
  memberships: {
    role: "ADMIN" | "TECHNICIAN";
    status: "PENDING" | "APPROVED";
    hotel: { id: string; name: string; city: string | null };
  }[];
};

export function fetchMe() {
  return apiFetch<MeResponse>("/auth/me");
}

export function registerPushToken(token: string) {
  return apiFetch<void>("/auth/push-token", { method: "POST", body: { token } });
}

// ---------- ลืมรหัสผ่าน (ไม่ต้องล็อกอิน) ----------

/** ขอรหัสยืนยัน 6 หลักทางอีเมล — ตอบสำเร็จเสมอ ไม่บอกว่าอีเมลนี้มีในระบบหรือไม่ */
export function forgotPassword(email: string) {
  return apiFetch<{ ok: true; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
}

export function resetPassword(email: string, code: string, password: string) {
  return apiFetch<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: { email, code, password },
    skipAuth: true,
  });
}

// ---------- แก้ไขโปรไฟล์ / เปลี่ยนรหัสผ่าน (ต้องล็อกอิน) ----------

export function updateProfile(data: { name?: string; email?: string }) {
  return apiFetch<{ id: string; name: string; email: string }>("/auth/me", {
    method: "PATCH",
    body: data,
  });
}

/** เปลี่ยนรหัสผ่านแล้ว server จะเพิกถอน session อื่นทั้งหมด และคืน token คู่ใหม่ให้เครื่องนี้ */
export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ accessToken: string; refreshToken: string }>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}
