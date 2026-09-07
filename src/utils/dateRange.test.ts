import { describe, expect, it } from "vitest";
import { rangeToDates, toIsoDate } from "./dateRange";

describe("toIsoDate", () => {
  it("เติมศูนย์หน้าเดือน/วันที่เลขหลักเดียว", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("ใช้เวลาท้องถิ่น ไม่ใช่ UTC (กันวันเพี้ยนไป 1 วันในไทย GMT+7)", () => {
    // 1 ม.ค. 2026 เวลา 00:30 ตามเครื่อง — ถ้าเผลอไปใช้ toISOString จะกลายเป็น 31 ธ.ค. 2025
    expect(toIsoDate(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });
});

describe("rangeToDates", () => {
  const today = new Date(2026, 8, 15); // 15 ก.ย. 2026

  it("'ทั้งหมด' ไม่ส่งช่วงวันที่ (= ไม่กรอง)", () => {
    expect(rangeToDates("all", today)).toBeUndefined();
  });

  it("7 วัน นับรวมวันนี้ (ย้อนหลัง 6 วัน)", () => {
    expect(rangeToDates("7d", today)).toEqual({ from: "2026-09-09", to: "2026-09-15" });
  });

  it("30 วัน นับรวมวันนี้ (ย้อนหลัง 29 วัน)", () => {
    expect(rangeToDates("30d", today)).toEqual({ from: "2026-08-17", to: "2026-09-15" });
  });

  it("'เดือนนี้' เริ่มที่วันที่ 1 ของเดือน", () => {
    expect(rangeToDates("month", today)).toEqual({ from: "2026-09-01", to: "2026-09-15" });
  });

  it("ข้ามเดือนได้ถูกต้อง (ต้นเดือนย้อนไปเดือนก่อน)", () => {
    expect(rangeToDates("7d", new Date(2026, 8, 3))).toEqual({ from: "2026-08-28", to: "2026-09-03" });
  });

  it("ข้ามปีได้ถูกต้อง", () => {
    expect(rangeToDates("7d", new Date(2026, 0, 3))).toEqual({ from: "2025-12-28", to: "2026-01-03" });
  });

  it("รองรับปีอธิกสุรทิน (29 ก.พ. 2028)", () => {
    expect(rangeToDates("7d", new Date(2028, 2, 3))).toEqual({ from: "2028-02-26", to: "2028-03-03" });
  });
});
