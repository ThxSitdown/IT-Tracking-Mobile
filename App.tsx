import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";

// แยกออกมาเป็นคอมโพเนนต์ย่อยเพราะต้องอยู่ "ข้างใน" ThemeProvider ถึงจะเรียก useTheme ได้
function ThemedApp() {
  const { isDark } = useTheme();
  return (
    <>
      {/* ธีมมืด = ไอคอนบนแถบสถานะต้องสว่าง / ธีมสว่าง = ต้องเข้ม ไม่งั้นจะกลืนกับพื้นหลังจนมองไม่เห็น */}
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
