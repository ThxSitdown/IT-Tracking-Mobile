import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { ThemeColors } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { CountUpText } from "./Motion";

export type DonutSegment = { label: string; value: number; color: string };

type Props = {
  data: DonutSegment[];
  /** ขนาดวงกลม (กว้าง=สูง) */
  size?: number;
  /** ความหนาของวง — ยิ่งน้อยยิ่งบาง */
  thickness?: number;
  /** ตัวเลขใหญ่ตรงกลางวง (ไม่ใส่จะใช้ผลรวมของทุกส่วน) */
  centerValue?: number;
  centerLabel?: string;
};

// แผนภาพวงกลมแบบโดนัท วาดด้วย react-native-svg — ใช้ stroke-dasharray ตัดส่วนโค้งของวงกลมเดียว
// แทนการคำนวณ path arc เอง ทำให้โค้ดสั้นและไม่มีปัญหาเรื่องมุมจุดตัดโค้ง
// หมุน -90° เพื่อให้ส่วนแรกเริ่มที่ตำแหน่ง 12 นาฬิกา (ธรรมชาติกว่าเริ่มที่ 3 นาฬิกาแบบค่าเริ่มต้นของ SVG)
export function DonutChart({ data, size = 150, thickness = 22, centerValue, centerLabel }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // กวาดส่วนโค้งจาก 0 ไปจนเต็มตอนแสดงผลครั้งแรก และทุกครั้งที่สัดส่วนเปลี่ยน
  // ทำให้เห็นว่ากราฟ "วาดขึ้นมาใหม่" หลังเปลี่ยนช่วงวันที่ ไม่ใช่ภาพนิ่งที่กระพริบเปลี่ยนค่า
  const sweep = useSweep(data.map((d) => d.value).join(","));

  let offset = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          {/* วงพื้นหลัง — เห็นตอนยังไม่มีข้อมูล และเป็นร่องให้ส่วนที่มีค่าน้อยมากไม่ดูลอย */}
          <Circle cx={center} cy={center} r={radius} stroke={colors.slateBg} strokeWidth={thickness} fill="none" />

          {total > 0 &&
            data.map((seg) => {
              if (seg.value <= 0) return null;
              const length = (seg.value / total) * circumference * sweep;
              const circle = (
                <Circle
                  key={seg.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
        </G>
      </Svg>

      <View style={styles.centerWrap} pointerEvents="none">
        <CountUpText value={centerValue ?? total} style={styles.centerValue} />
        {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
      </View>
    </View>
  );
}

/**
 * คืนค่า 0→1 ที่ไล่ขึ้นใหม่ทุกครั้งที่ key เปลี่ยน — ใช้คูณความยาวส่วนโค้งเพื่อให้โดนัทค่อยๆ กวาดเต็มวง
 * ต้อง setState ตามค่าที่อ่านได้ (ไม่ใช้ native driver) เพราะค่านี้ถูกใช้คำนวณ strokeDasharray ในฝั่ง JS
 */
function useSweep(key: string, duration = 650) {
  const animated = useRef(new Animated.Value(0)).current;
  const [value, setValue] = useState(0);

  useEffect(() => {
    const id = animated.addListener(({ value: v }) => setValue(v));
    animated.setValue(0);
    const anim = Animated.timing(animated, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => {
      anim.stop();
      animated.removeListener(id);
    };
  }, [animated, key, duration]);

  return value;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  centerWrap: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  centerValue: { fontSize: 24, fontWeight: "800", color: colors.textPrimary },
  centerLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
});
