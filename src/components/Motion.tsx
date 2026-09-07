import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";

/**
 * ชุดคอมโพเนนต์อนิเมชันที่ใช้ซ้ำได้ทั้งแอป
 * ใช้ Animated ที่มากับ React Native (ไม่พึ่งไลบรารีเพิ่ม) — ทำงานได้ทั้งบนมือถือและเว็บ
 */

type FadeInProps = {
  children: ReactNode;
  /** หน่วงก่อนเริ่ม (ms) — ใส่ค่าไล่ขึ้นเพื่อให้รายการโผล่ทีละใบ */
  delay?: number;
  /** ระยะที่เลื่อนขึ้นมาระหว่างจาง (px) ใส่ 0 ถ้าอยากได้แค่จางเข้า */
  offsetY?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/** จางเข้าพร้อมเลื่อนขึ้นเล็กน้อยตอนถูก mount — ใช้กับการ์ด/บล็อกเนื้อหาที่เพิ่งโหลดเสร็จ */
export function FadeInView({ children, delay = 0, offsetY = 10, duration = 320, style }: FadeInProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offsetY, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type ScaleProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** ย่อลงเหลือเท่าไรตอนกด (1 = ไม่ย่อ) */
  activeScale?: number;
};

/**
 * ปุ่ม/การ์ดที่ยุบลงเล็กน้อยตอนกด แล้วเด้งกลับตอนปล่อย
 * ให้ความรู้สึกว่ากดติดจริง โดยเฉพาะบนเว็บที่ไม่มี ripple แบบ Android
 */
export function PressableScale({ children, style, activeScale = 0.97, ...rest }: ScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        animateTo(activeScale);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * ตัวเลขที่ไล่นับขึ้นจากค่าเดิมไปค่าใหม่ — ใช้กับตัวเลขสรุปในหน้าแดชบอร์ด
 * ให้ความรู้สึกว่าข้อมูล "กำลังเข้ามา" แทนที่จะเด้งเปลี่ยนทันทีจนไม่ทันสังเกตว่าอัปเดตแล้ว
 *
 * ใช้ Animated.Value + listener แล้ว setState แทนการนับด้วย setInterval เอง
 * เพื่อให้ได้เส้นโค้งความเร็วเดียวกับอนิเมชันอื่นในแอป (ช้าลงตอนใกล้ถึงค่าจริง)
 */
export function CountUpText({
  value,
  duration = 700,
  style,
  format,
}: {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  /** จัดรูปเลขก่อนแสดง เช่น เติมศูนย์ให้ครบ 3 หลัก */
  format?: (n: number) => string;
}) {
  const animated = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const id = animated.addListener(({ value: v }) => setDisplay(Math.round(v)));
    const anim = Animated.timing(animated, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // นับเลขต้องอ่านค่าออกมาที่ฝั่ง JS จึงใช้ native driver ไม่ได้
    });
    anim.start();
    return () => {
      anim.stop();
      animated.removeListener(id);
    };
  }, [animated, value, duration]);

  return <Text style={style}>{format ? format(display) : display}</Text>;
}

/**
 * แท่งกราฟที่ยืดจาก 0 ไปจนถึงสัดส่วนจริง
 * ใช้ทั้งแท่งแนวนอน (งานตามประเภท/ผู้รับผิดชอบ) และแท่งแนวตั้ง (แนวโน้ม 7 วัน)
 * ต้องใช้ useNativeDriver: false เพราะ width/height เป็นคุณสมบัติของ layout ไม่ใช่ transform
 */
export function GrowBar({
  percent,
  axis,
  delay = 0,
  duration = 550,
  style,
}: {
  /** ความยาวสุดท้ายเป็นเปอร์เซ็นต์ (0-100) */
  percent: number;
  axis: "width" | "height";
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: percent,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, percent, delay, duration]);

  const size = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return <Animated.View style={[style, axis === "width" ? { width: size } : { height: size }]} />;
}
