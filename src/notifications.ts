import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { registerPushToken } from "./api/auth";
import { navigateToJob } from "./navigation/navigationRef";
import { usePrefsStore } from "./store/prefsStore";

// ไม่ตั้งค่านี้ไว้ notification ที่มาตอนแอปเปิดอยู่ (foreground) จะไม่ขึ้นแบนเนอร์ให้เห็นเลยทั้ง iOS และ Android
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    // shouldShowAlert เดิมถูก deprecate ตั้งแต่ SDK 57 — ใช้ shouldShowBanner/shouldShowList แทนแล้ว
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getPushToken(): Promise<string | null> {
  // push notification ใช้ไม่ได้บน simulator/emulator ต้องเป็นอุปกรณ์จริงเท่านั้น
  if (!Device.isDevice) {
    console.log("[IT Tracking] ข้ามการขอ push token — ไม่ใช่อุปกรณ์จริง (simulator/emulator)");
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") {
    console.log("[IT Tracking] ผู้ใช้ไม่อนุญาตการแจ้งเตือน");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // ต้องมี EAS project id ก่อนถึงจะขอ push token ได้ (ตั้งค่าครั้งเดียวด้วยคำสั่ง `eas init` — ดู README)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.log(
      "[IT Tracking] ยังไม่มี EAS project id — รัน `eas init` ก่อนถึงจะใช้ push notification ได้ (ดู mobile/README.md)"
    );
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.log("[IT Tracking] ขอ push token ไม่สำเร็จ:", err);
    return null;
  }
}

// เรียก hook นี้ตัวเดียวตอนแอปเข้าสู่หน้าหลักแล้ว (login + เลือกโรงแรมแล้ว) — จะขอสิทธิ์, ลงทะเบียน token
// กับ server, และตั้ง listener ให้แตะ notification แล้วพาไปหน้ารายละเอียดงานที่เกี่ยวข้องได้เลย
export function useRegisterPushNotifications() {
  const pushEnabled = usePrefsStore((s) => s.pushEnabled);

  useEffect(() => {
    // ผู้ใช้ปิดแจ้งเตือนไว้ในหน้าตั้งค่า — ไม่ต้องขอสิทธิ์/ลงทะเบียน token ให้เสียเวลา
    if (!pushEnabled) return;

    getPushToken().then((token) => {
      if (token) registerPushToken(token).catch(() => {});
    });

    // ผู้ใช้แตะ notification (ไม่ว่าแอปจะอยู่ foreground, background, หรือปิดอยู่แล้วเปิดจาก notification)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const jobId = response.notification.request.content.data?.jobId as string | undefined;
      if (jobId) navigateToJob(jobId);
    });

    return () => subscription.remove();
  }, [pushEnabled]);
}
