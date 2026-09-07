import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "./types";

// ต้องมี ref แยกแบบนี้เพราะ listener ของการแจ้งเตือน (ตอนผู้ใช้แตะ notification) ทำงานนอก React component tree
// เรียก navigation ปกติผ่าน props/hook ไม่ได้ ต้องใช้ ref ตัวนี้แทน — ผูกไว้กับ NavigationContainer ใน App.tsx
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToJob(jobId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate("JobDetail", { jobId });
  }
}
