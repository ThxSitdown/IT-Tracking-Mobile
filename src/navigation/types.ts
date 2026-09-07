import { NavigatorScreenParams } from "@react-navigation/native";

// แท็บล่าง — สอดคล้องกับ navbar ที่ออกแบบไว้ใน Figma (หน้าหลัก / งาน / รายงาน / โปรไฟล์)
export type MainTabParamList = {
  DashboardTab: undefined;
  JobsTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
};

// สแต็กหลักของแอป — ครอบแท็บล่างไว้ใน "Main" หนึ่งจุด ส่วนหน้าที่ต้องเต็มจอ (ไม่มี tab bar)
// อย่าง JobDetail, AddJob และหน้า auth ต่างๆ อยู่แยกนอกแท็บ
export type RootStackParamList = {
  SignIn: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  EditProfile: undefined;
  JoinProperty: undefined;
  CreateHotel: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  JobDetail: { jobId: string };
  AddJob: undefined;
  EditJob: { jobId: string };
  Notifications: undefined;
  Settings: undefined;
  SwitchHotel: undefined;
  TeamManagement: undefined;
};
