module.exports = function (api) {
  api.cache(true);
  return {
    // SDK 57 เปิด transform ของ `import.meta` (แปลงเป็น globalThis.__ExpoImportMetaRegistry) ให้เป็นค่าเริ่มต้นแล้ว
    // จึงไม่ต้องตั้งค่าเพิ่มเหมือนตอน SDK 54 ที่ต้องเปิดเองไม่งั้นเว็บพังตอนโหลด
    presets: ["babel-preset-expo"],
  };
};
