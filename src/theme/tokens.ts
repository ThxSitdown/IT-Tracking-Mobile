// ค่าดีไซน์ชุดเดียวกับที่ใช้ตอนทำ Figma mockup — เปลี่ยนที่นี่จุดเดียว มีผลทั้งแอป
//
// โครงสร้าง: มีชุดสี 2 ชุด (สว่าง/มืด) ที่ "ชื่อคีย์เหมือนกันทุกตัว" แล้ว ThemeProvider เลือกมาให้ตอนรัน
// หน้าจอต่างๆ เรียกผ่าน useTheme() แทนการ import colors ตรงๆ จึงเปลี่ยนธีมได้ทั้งแอปโดยไม่ต้องรีสตาร์ท
//
// ยังคง export `colors` (ชุดสว่าง) ไว้เพื่อความเข้ากันได้กับโค้ดเดิมที่ยังไม่ได้ย้ายไปใช้ useTheme
// — ใช้ได้กับส่วนที่สีไม่ต้องเปลี่ยนตามธีม เช่นสีแบรนด์บนพื้นเข้มที่เป็นเข้มอยู่แล้ว

export type ThemeColors = {
  // พื้นหลังและพื้นผิว
  navyInk: string; // พื้นหลังหน้า auth (เข้มเสมอทั้งสองธีม)
  cloud: string; // พื้นหลังหลักของแอป
  white: string; // พื้นการ์ด
  border: string;

  // สีแบรนด์ (ไม่เปลี่ยนตามธีม)
  brass: string;
  brassLight: string;
  signalBlue: string;
  signalBlueDark: string;

  // สีสถานะ
  green: string;
  greenBg: string;
  amber: string;
  amberBg: string;
  slate: string;
  slateBg: string;
  red: string;
  redBg: string;

  // ตัวอักษร
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
};

export const lightColors: ThemeColors = {
  navyInk: "#111830",
  cloud: "#F3F5FB",
  white: "#FFFFFF",
  brass: "#C9972B",
  brassLight: "#EFD48E",
  signalBlue: "#3E6FF2",
  signalBlueDark: "#2C51C4",
  green: "#1FB978",
  greenBg: "#DFF6EA",
  amber: "#F5A623",
  amberBg: "#FDECC8",
  slate: "#8A93A6",
  slateBg: "#E9EBF1",
  red: "#E5484D",
  redBg: "#FCE1E2",
  textPrimary: "#151A2B",
  textSecondary: "#6B7280",
  textTertiary: "#9AA1B1",
  border: "#E5E8F0",
};

// ชุดมืด: คงสีแบรนด์/สีสถานะไว้ให้จำได้ แต่สลับพื้นหลัง-ตัวอักษร และทำสีพื้นหลังของ badge
// ให้เป็นโทนเข้มโปร่ง เพื่อให้ badge ยังอ่านออกบนพื้นมืด (ใช้สีอ่อนเดิมจะสว่างจ้าเกินไป)
export const darkColors: ThemeColors = {
  navyInk: "#0B1020",
  cloud: "#10141F",
  white: "#1A1F2E", // "พื้นการ์ด" — ในธีมมืดคือเทาเข้ม ไม่ใช่ขาว (คงชื่อคีย์เดิมไว้ไม่ให้ต้องแก้ทุกหน้าจอ)
  brass: "#C9972B",
  brassLight: "#EFD48E",
  signalBlue: "#5B84F5",
  signalBlueDark: "#3E6FF2",
  green: "#2ACE8A",
  greenBg: "#12352A",
  amber: "#F5A623",
  amberBg: "#3A2C10",
  slate: "#9AA3B8",
  slateBg: "#252B3B",
  red: "#F0666B",
  redBg: "#3A1E22",
  textPrimary: "#ECEFF7",
  textSecondary: "#A7AFC2",
  textTertiary: "#7C859B",
  border: "#2A3142",
};

/** @deprecated ใช้ useTheme() แทน เพื่อให้สีเปลี่ยนตามธีมที่ผู้ใช้เลือก */
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radius = { sm: 12, md: 16, lg: 22, pill: 20 };

// ป้ายสถานะ — สีขึ้นกับธีม จึงต้องสร้างจากชุดสีที่กำลังใช้อยู่ ไม่ fix ไว้ตายตัว
export function getStatusMeta(c: ThemeColors) {
  return {
    ON_PROCESS: { label: "On Process", color: c.amber, bg: c.amberBg },
    DONE: { label: "Done", color: c.green, bg: c.greenBg },
    CANCELLED: { label: "Cancel", color: c.slate, bg: c.slateBg },
  } as const;
}

/** @deprecated ใช้ getStatusMeta(theme) แทน */
export const statusMeta = getStatusMeta(lightColors);
