import { Alert, Platform } from "react-native";

export type DialogButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

// react-native-web ไม่ได้ implement Alert เลย — `showDialog()` ของมันคือฟังก์ชันว่างๆ (no-op)
// ผลคือบนเว็บ กล่องยืนยันไม่เคยขึ้น และ onPress ไม่เคยถูกเรียก (เช่นกดออกจากระบบแล้วไม่มีอะไรเกิดขึ้น)
// รวมถึงข้อความ validation ต่างๆ ก็เงียบหายไปหมด
//
// ฟังก์ชันนี้จึงเป็นทางผ่านเดียวของแอปสำหรับกล่องข้อความ:
// - บนมือถือ ใช้ Alert ของ react-native ตามเดิม (ได้หน้าตา native จริง)
// - บนเว็บ ใช้ window.confirm / window.alert แทน
export function showDialog(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // ไม่มีปุ่ม หรือมีปุ่มเดียว = แค่แจ้งให้ทราบ
  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }
  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  // มีหลายปุ่ม = ต้องให้ผู้ใช้ยืนยัน — window.confirm รองรับได้แค่ ตกลง/ยกเลิก
  // จึงถือว่าปุ่มที่ไม่ใช่ "cancel" ตัวแรกคือการกระทำหลัก (ปุ่มที่เหลือเข้าถึงไม่ได้บนเว็บ
  // — ที่เรียกใช้ต้องออกแบบให้เหลือไม่เกิน 2 ตัวเลือกบนเว็บ ดู PhotoGallery เป็นตัวอย่าง)
  const cancelButton = buttons.find((b) => b.style === "cancel");
  const confirmButton = buttons.find((b) => b.style !== "cancel");

  const label = confirmButton ? `${text}\n\n[ ${confirmButton.text} ]` : text;
  if (window.confirm(label)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
