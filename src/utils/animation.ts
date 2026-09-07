import { LayoutAnimation, Platform, UIManager } from "react-native";

// LayoutAnimation ต้องเปิดใช้เองบน Android (แพลตฟอร์มอื่นเปิดอยู่แล้ว)
// เรียกครั้งเดียวตอนโหลดโมดูล — ถ้า API ไม่มีก็ข้ามไปเงียบๆ ไม่ให้แอปพัง
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * ให้การเปลี่ยนแปลง layout ครั้งถัดไป (เพิ่ม/ลบ/ย่อ-ขยายรายการ) ค่อยๆ เคลื่อนแทนการกระตุกเปลี่ยนทันที
 * เรียกก่อน setState ที่จะทำให้ layout เปลี่ยน เช่น กดเปิดแผงกรอง หรือเพิ่ม/ลบชิปผู้รับผิดชอบ
 *
 * ห่อ try/catch ไว้เพราะบางแพลตฟอร์ม (เว็บ / บาง build ของ Android) ไม่รองรับเต็มที่
 * ถ้าเรียกไม่ได้ก็แค่ไม่มีอนิเมชัน ไม่ควรทำให้การอัปเดตหน้าจอล้มเหลวตามไปด้วย
 */
export function configureNextAnimation(duration = 220) {
  try {
    LayoutAnimation.configureNext({
      duration,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  } catch {
    // ไม่รองรับก็ข้าม — ไม่มีอนิเมชันดีกว่าแอปพัง
  }
}

/** หน่วงเวลาเริ่มอนิเมชันของรายการลำดับที่ i เพื่อให้ไล่ขึ้นทีละใบ ไม่โผล่พร้อมกันหมด */
export function staggerDelay(index: number, step = 45, max = 360) {
  return Math.min(index * step, max);
}
