import { apiFetch } from "./client";

export type HotelMembership = {
  role: "ADMIN" | "TECHNICIAN";
  status: "PENDING" | "APPROVED";
  hotel: { id: string; name: string; city: string | null; memberCount: number };
};

export function listMyHotels() {
  return apiFetch<HotelMembership[]>("/hotels");
}

export function joinHotel(joinCode: string) {
  return apiFetch("/hotels/join", { method: "POST", body: { joinCode } });
}

export type CreatedHotel = {
  id: string;
  name: string;
  city: string | null;
  joinCode: string;
};

export function createHotel(name: string, city?: string) {
  return apiFetch<CreatedHotel>("/hotels", { method: "POST", body: { name, city } });
}

// ---- จัดการทีม (เฉพาะ Admin ของโรงแรมนั้น) ----

export type HotelDetail = {
  id: string;
  name: string;
  city: string | null;
  joinCode: string;
  joinCodeExpires: string | null;
  memberCount: number;
};

/** ข้อมูลโรงแรม + รหัสเข้าทีม — ฝั่ง server จำกัดไว้ให้เฉพาะ Admin เรียกได้ */
export function getHotelDetail(hotelId: string) {
  return apiFetch<HotelDetail>(`/hotels/${hotelId}`);
}

export type PendingMember = {
  id: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

export function listPendingMembers(hotelId: string) {
  return apiFetch<PendingMember[]>(`/hotels/${hotelId}/members/pending`);
}

export type TeamMember = {
  id: string;
  role: "ADMIN" | "TECHNICIAN";
  user: { id: string; name: string; email: string };
};

export function listMembers(hotelId: string) {
  return apiFetch<TeamMember[]>(`/hotels/${hotelId}/members`);
}

export function approveMember(hotelId: string, membershipId: string) {
  return apiFetch(`/hotels/${hotelId}/members/${membershipId}/approve`, { method: "POST" });
}

/** ใช้ได้ทั้ง "ปฏิเสธคำขอเข้าร่วม" และ "เอาสมาชิกออกจากทีม" — ทั้งสองกรณีคือลบ membership ทิ้ง */
export function removeMember(hotelId: string, membershipId: string) {
  return apiFetch(`/hotels/${hotelId}/members/${membershipId}`, { method: "DELETE" });
}

export function regenerateJoinCode(hotelId: string) {
  return apiFetch<{ joinCode: string; joinCodeExpires: string | null }>(
    `/hotels/${hotelId}/join-code/regenerate`,
    { method: "POST" }
  );
}

export type AssignableMember = { id: string; name: string };

// รายชื่อทีมแบบย่อ (ไม่มีอีเมล) — สมาชิกทุกคนเรียกได้ ใช้เติมตัวเลือก "มอบหมายงานให้" ในหน้า Job Detail
export function listAssignableMembers(hotelId: string) {
  return apiFetch<AssignableMember[]>(`/hotels/${hotelId}/members/assignable`);
}
