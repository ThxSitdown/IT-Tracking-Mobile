import { apiFetch } from "./client";

export type NotificationType = "JOB_CREATED" | "JOB_ASSIGNED" | "NOTE_ADDED" | "JOB_CLOSED";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  jobId: string | null;
  read: boolean;
  createdAt: string;
};

// การแจ้งเตือนถูก scope ด้วยโรงแรมที่กำลังใช้งานอยู่เสมอ (เหมือน jobs/dashboard)
export function listNotifications(hotelId: string) {
  return apiFetch<{ notifications: AppNotification[]; unreadCount: number }>(
    `/hotels/${hotelId}/notifications`
  );
}

export function markAllNotificationsRead(hotelId: string) {
  return apiFetch(`/hotels/${hotelId}/notifications/read-all`, { method: "POST" });
}

export function markNotificationRead(hotelId: string, notificationId: string) {
  return apiFetch(`/hotels/${hotelId}/notifications/${notificationId}/read`, { method: "POST" });
}
