import { ReactNode } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { ThemeColors } from "../../theme/tokens";
import { useThemedStyles } from "../../theme/ThemeProvider";

const GRID_SPACING = 34;

// พื้นหลังหน้า auth ตามดีไซน์ — เส้นตารางจางๆ กับจุดกระจายเล็กน้อย ให้ดูมีมิติแทนพื้นทึบเรียบๆ
// วาดด้วย SVG เส้นตรงล้วน ไม่ใช้ไฟล์ภาพ จึงคมทุกความละเอียดหน้าจอและไม่เพิ่มขนาดแอป
export function AuthBackground({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const { width, height } = useWindowDimensions();

  const columns = Math.ceil(width / GRID_SPACING);
  const rows = Math.ceil(height / GRID_SPACING);

  // จุดประปราย — คำนวณจากดัชนีแบบคงที่ (ไม่สุ่ม) เพื่อไม่ให้ตำแหน่งจุดกระโดดทุกครั้งที่ re-render
  const dots = Array.from({ length: 18 }, (_, i) => ({
    cx: ((i * 137) % 100) / 100,
    cy: ((i * 79) % 100) / 100,
    r: i % 3 === 0 ? 1.6 : 1,
  }));

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        {Array.from({ length: columns + 1 }, (_, i) => (
          <Line
            key={`v${i}`}
            x1={i * GRID_SPACING}
            y1={0}
            x2={i * GRID_SPACING}
            y2={height}
            stroke="#FFFFFF"
            strokeOpacity={0.035}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * GRID_SPACING}
            x2={width}
            y2={i * GRID_SPACING}
            stroke="#FFFFFF"
            strokeOpacity={0.035}
            strokeWidth={1}
          />
        ))}
        {dots.map((d, i) => (
          <Circle
            key={`d${i}`}
            cx={d.cx * width}
            cy={d.cy * height}
            r={d.r}
            fill="#FFFFFF"
            fillOpacity={0.12}
          />
        ))}
      </Svg>
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navyInk },
});
