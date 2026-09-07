import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { RootStackParamList } from "./types";
import { navigationRef } from "./navigationRef";
import { SignInScreen } from "../screens/SignInScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { JoinPropertyScreen } from "../screens/JoinPropertyScreen";
import { CreateHotelScreen } from "../screens/CreateHotelScreen";
import { MainTabNavigator } from "./BottomTabs";
import { JobDetailScreen } from "../screens/JobDetailScreen";
import { AddJobScreen } from "../screens/AddJobScreen";
import { EditJobScreen } from "../screens/EditJobScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SwitchHotelScreen } from "../screens/SwitchHotelScreen";
import { TeamManagementScreen } from "../screens/TeamManagementScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { fetchMe } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { usePrefsStore } from "../store/prefsStore";
import { useTheme } from "../theme/ThemeProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

// รูปแบบนี้คือ "Authentication flow" ตามคำแนะนำของ React Navigation เอง:
// https://reactnavigation.org/docs/auth-flow/
// สลับกลุ่มหน้าจอที่ลงทะเบียนใน Stack.Navigator ตามสถานะปัจจุบันสด ๆ แทนการเรียก navigation.reset()
// กระจัดกระจายทั่วแอป — ข้อดีคือถ้า token หมดอายุ/ถูก logout จากที่ไหนก็ตาม (แม้แต่ตอนพัง background)
// แอปจะสลับกลับไปหน้า Sign In ให้อัตโนมัติทันที ไม่มีทางค้างอยู่หน้าเดิมแบบไม่มีทางออกอีก
export function RootNavigator() {
  const { isHydrated, hydrate, accessToken, activeHotelId } = useAuthStore();
  const setUser = useAuthStore((s) => s.setUser);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);
  const { colors, isDark } = useTheme();

  // ต้องส่งธีมให้ NavigationContainer ด้วย ไม่งั้นพื้นหลังของตัว navigator เอง และ "หัวข้อด้านบน" ของ
  // native-stack จะใช้ชุดสีสว่างของ React Navigation เสมอ — พอเปิดธีมมืดจะเห็นแถบขาวโพลนคาดอยู่ด้านบน
  const navigationTheme: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.signalBlue,
      background: colors.cloud,
      card: colors.white, // พื้นหลังของ header
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.red,
    },
  };

  useEffect(() => {
    hydrate();
    // โหลดการตั้งค่าส่วนตัว (เช่น เปิด/ปิด push) คู่กันไป — ไม่ต้องบล็อกหน้าจอรอ เพราะมีค่าเริ่มต้นอยู่แล้ว
    hydratePrefs();
  }, []);

  // ดึงโปรไฟล์ล่าสุดจาก server หลัง hydrate เสร็จ ทำ 2 อย่างพร้อมกัน:
  // 1) กู้ข้อมูลให้ session ที่ล็อกอินค้างไว้ "ก่อน" แอปจะเริ่มเก็บ user ลงเครื่อง (ไม่งั้นต้องออกแล้วเข้าใหม่ถึงจะเห็นชื่อ)
  // 2) ให้ชื่อ/อีเมลตรงกับฝั่ง server เสมอ เผื่อมีการแก้ไขจากที่อื่น
  // เรียกที่นี่แทนใน authStore เพื่อเลี่ยง circular import (api/client.ts import สโตร์นี้อยู่แล้ว)
  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    fetchMe()
      .then((me) => setUser({ id: me.id, name: me.name, email: me.email }))
      .catch(() => {}); // ต่อเน็ตไม่ได้ก็ไม่เป็นไร — ยังมีข้อมูลที่เก็บไว้ในเครื่องใช้ไปก่อน
  }, [isHydrated, accessToken]);

  if (!isHydrated) {
    // รอโหลด token จาก SecureStore ก่อน ไม่งั้นจะกระพริบไปหน้า Sign In ก่อนเสมอแม้ผู้ใช้ล็อกอินค้างไว้แล้ว
    return (
      <View style={{ flex: 1, backgroundColor: colors.navyInk, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brassLight} />
      </View>
    );
  }

  const isLoggedIn = !!accessToken;

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // หน้าไหนที่เปิด header ต้องใช้สีตามธีมเดียวกับเนื้อหาข้างล่าง
          headerStyle: { backgroundColor: colors.white },
          headerTitleStyle: { color: colors.textPrimary },
          headerTintColor: colors.textPrimary, // สีปุ่มย้อนกลับ
          contentStyle: { backgroundColor: colors.cloud },
        }}
      >
        {!isLoggedIn ? (
          <Stack.Group>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </Stack.Group>
        ) : !activeHotelId ? (
          <Stack.Group>
            <Stack.Screen name="JoinProperty" component={JoinPropertyScreen} />
            <Stack.Screen name="CreateHotel" component={CreateHotelScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            {/* "Main" ครอบแท็บล่างทั้งชุด (หน้าหลัก/งาน/รายงาน/โปรไฟล์) ไว้ในจุดเดียว */}
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="JobDetail"
              component={JobDetailScreen}
              options={{ headerShown: true, title: "รายละเอียดงาน" }}
            />
            <Stack.Screen name="AddJob" component={AddJobScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="EditJob" component={EditJobScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="SwitchHotel" component={SwitchHotelScreen} options={{ presentation: "modal" }} />
            <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
