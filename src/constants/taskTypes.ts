// ประเภทงาน IT Support ของโรงแรม — เฉพาะระบบ/อุปกรณ์ที่ทีม IT ดูแลจริง (ไม่รวมงานช่างทั่วไปอย่างไฟฟ้า/ประปา/แอร์)
// แก้ไข/เพิ่มรายการได้ตรงนี้จุดเดียว มีผลกับทั้งแอป
// ค่า "value" คือสิ่งที่บันทึกลงฐานข้อมูลจริง (ควรคงที่ไม่เปลี่ยนภายหลัง เพื่อไม่ให้ข้อมูลเก่าไม่ตรงกับของใหม่)
export const TASK_TYPES = [
  { label: "PC", value: "PC" },
  { label: "Internet", value: "Internet" },
  { label: "TV", value: "TV" },
  { label: "Telephone", value: "Telephone" },
  { label: "Printer", value: "Printer" },
  { label: "Passport Scanner", value: "Passport Scanner" },
  { label: "Music", value: "Music" },
  { label: "Doorlock", value: "Doorlock" },
  { label: "Purchasing", value: "Purchasing" },
  { label: "Contract", value: "Contract" },
  { label: "Keycard System", value: "Keycard System" },
  { label: "Opera", value: "Opera" },
  { label: "HR System", value: "HR System" },
  { label: "Simphony", value: "Simphony" },
  { label: "IT Project", value: "IT Project" },
] as const;
