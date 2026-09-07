import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // เทสต์เฉพาะตรรกะล้วนๆ ที่ไม่ต้อง render React Native (คำนวณวันที่, จัดรูปแบบข้อมูล ฯลฯ)
    include: ["src/**/*.test.ts"],
  },
});
