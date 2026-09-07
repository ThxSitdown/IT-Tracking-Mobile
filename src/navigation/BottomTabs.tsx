import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList, RootStackParamList } from "./types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { AllJobsScreen } from "../screens/AllJobsScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ThemeColors, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { useRegisterPushNotifications } from "../notifications";
import { useResponsive } from "../hooks/useResponsive";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<keyof MainTabParamList, { label: string; icon: IoniconName; iconActive: IoniconName }> = {
  DashboardTab: { label: "หน้าหลัก", icon: "home-outline", iconActive: "home" },
  JobsTab: { label: "งาน", icon: "briefcase-outline", iconActive: "briefcase" },
  ReportsTab: { label: "รายงาน", icon: "bar-chart-outline", iconActive: "bar-chart" },
  ProfileTab: { label: "โปรไฟล์", icon: "person-outline", iconActive: "person" },
};

// tab bar แบบกำหนดเองทั้งหมด เพื่อให้คุมสี/ตำแหน่งปุ่ม + ตรงกับดีไซน์ที่ทำใน Figma ได้เป๊ะ
// (ปุ่ม + ตรงกลางยกสูงขึ้นมา ไม่ใช่แท็บปกติ — กดแล้วเปิดหน้า AddJob แบบ modal จากสแต็กหลัก ไม่ใช่สลับแท็บ)
// บนจอกว้าง (isDesktop) จะเรนเดอร์เป็น sidebar ด้านซ้ายแทน bottom bar — ใช้ tabBarPosition: "left" ของ
// react-navigation ที่จัดการ layout แบบแถว (sidebar + เนื้อหา) ให้อัตโนมัติอยู่แล้ว ไม่ต้อง hack เอง
function CustomTabBar({ state, navigation }: any) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDesktop } = useResponsive();

  if (isDesktop) {
    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarBrand}>
          <Ionicons name="hardware-chip" size={22} color={colors.brass} />
          <Text style={styles.sidebarBrandText}>IT Tracking</Text>
        </View>

        <Pressable style={styles.sidebarAddButton} onPress={() => rootNavigation.navigate("AddJob")}>
          <Ionicons name="add-circle" size={18} color="#3A2C05" />
          <Text style={styles.sidebarAddButtonText}>เพิ่มใบงาน</Text>
        </Pressable>

        <View style={styles.sidebarNav}>
          {state.routes.map((route: any, index: number) => (
            <SidebarItem key={route.key} route={route} index={index} state={state} navigation={navigation} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      {state.routes.slice(0, 2).map((route: any, index: number) => (
        <TabButton key={route.key} route={route} index={index} state={state} navigation={navigation} />
      ))}

      <View style={styles.tabItem}>
        <Pressable style={styles.fab} onPress={() => rootNavigation.navigate("AddJob")}>
          <Ionicons name="add" size={26} color="#3A2C05" />
        </Pressable>
      </View>

      {state.routes.slice(2).map((route: any, index: number) => (
        <TabButton key={route.key} route={route} index={index + 2} state={state} navigation={navigation} />
      ))}
    </View>
  );
}

function TabButton({ route, index, state, navigation }: any) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isFocused = state.index === index;
  const meta = TAB_META[route.name as keyof MainTabParamList];

  return (
    <Pressable
      style={styles.tabItem}
      onPress={() => {
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      }}
    >
      <Ionicons name={isFocused ? meta.iconActive : meta.icon} size={20} color={isFocused ? colors.signalBlue : colors.textTertiary} />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{meta.label}</Text>
    </Pressable>
  );
}

function SidebarItem({ route, index, state, navigation }: any) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isFocused = state.index === index;
  const meta = TAB_META[route.name as keyof MainTabParamList];

  return (
    <Pressable
      style={[styles.sidebarItem, isFocused && styles.sidebarItemActive]}
      onPress={() => {
        const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      }}
    >
      <Ionicons name={isFocused ? meta.iconActive : meta.icon} size={19} color={isFocused ? colors.signalBlue : colors.textSecondary} />
      <Text style={[styles.sidebarItemText, isFocused && styles.sidebarItemTextActive]}>{meta.label}</Text>
    </Pressable>
  );
}

export function MainTabNavigator() {
  // เรียกครั้งเดียวตอนเข้าสู่แอปหลักแล้ว (login + เลือกโรงแรมแล้ว) — ขอสิทธิ์แจ้งเตือนและลงทะเบียน push token
  useRegisterPushNotifications();
  const { isDesktop } = useResponsive();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarPosition: isDesktop ? "left" : "bottom" }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen} />
      <Tab.Screen name="JobsTab" component={AllJobsScreen} />
      <Tab.Screen name="ReportsTab" component={ReportsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 22, // เผื่อ safe area ด้านล่างจอ iPhone ที่มี home indicator
    alignItems: "flex-start",
  },
  tabItem: { flex: 1, alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 10.5, fontWeight: "600", color: colors.textTertiary },
  tabLabelActive: { color: colors.signalBlue },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.brass,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.white,
  },
  // --- sidebar (จอกว้าง) ---
  sidebar: {
    width: 232,
    height: "100%",
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  sidebarBrand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  sidebarBrandText: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
  sidebarAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brass,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: spacing.xl,
  },
  sidebarAddButtonText: { color: "#3A2C05", fontWeight: "700", fontSize: 13.5 },
  sidebarNav: { gap: 4 },
  sidebarItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: spacing.sm, borderRadius: 10 },
  sidebarItemActive: { backgroundColor: colors.slateBg },
  sidebarItemText: { fontSize: 13.5, fontWeight: "600", color: colors.textSecondary },
  sidebarItemTextActive: { color: colors.signalBlue },
});
