// แยกตรรกะคำนวณช่วงวันที่ออกมาจากหน้าจอ เพื่อให้เขียนเทสต์ครอบได้โดยไม่ต้อง render React
export type RangeKey = "all" | "7d" | "30d" | "month";

export type DateRange = { from: string; to: string };

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * แปลงตัวเลือกช่วงเวลาเป็นวันที่เริ่ม-สิ้นสุด
 * รับ `today` เข้ามาได้เพื่อให้เทสต์ล็อกวันที่ได้ (ไม่ใส่ = ใช้วันนี้)
 * - 7d/30d นับรวมวันนี้ด้วย (7 วันล่าสุด = วันนี้ + ย้อนหลัง 6 วัน)
 * - month = ตั้งแต่วันที่ 1 ของเดือนปัจจุบัน
 */
export function rangeToDates(key: RangeKey, today: Date = new Date()): DateRange | undefined {
  if (key === "all") return undefined;

  const from = new Date(today);
  if (key === "7d") from.setDate(today.getDate() - 6);
  else if (key === "30d") from.setDate(today.getDate() - 29);
  else from.setDate(1);

  return { from: toIsoDate(from), to: toIsoDate(today) };
}
