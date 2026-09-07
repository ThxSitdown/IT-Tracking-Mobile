import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

// โลโก้แอปบนหน้า auth — สี่เหลี่ยมมนไล่เฉดทองพร้อมเงาเรืองๆ ตามดีไซน์
// ตอนนี้ใช้ไอคอนประแจ (งานช่าง/IT support) ไปก่อน — เปลี่ยนเป็นโลโก้จริงภายหลังได้โดยแก้แค่ไฟล์นี้
// (จะสลับไปใช้ไอคอนโรงแรมก็เปลี่ยน name เป็น "business" ได้เลย)
export function AppLogo({ size = 84 }: { size?: number }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.glow, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <LinearGradient
        colors={["#F2D89B", "#C9972B"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.tile, { borderRadius: size * 0.3 }]}
      >
        <Ionicons name="construct" size={size * 0.44} color="#3A2C05" />
      </LinearGradient>
    </View>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  glow: {
    alignSelf: "center",
    shadowColor: "#C9972B",
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tile: { flex: 1, alignItems: "center", justifyContent: "center" },
});
