import { apiFetch } from "./client";

export type JobStatus = "ON_PROCESS" | "DONE" | "CANCELLED";

export type JobPhoto = {
  id: string;
  url: string;
  createdAt: string;
};

/** แนบรูปได้สูงสุดกี่รูปต่อใบงาน — ต้องตรงกับ MAX_PHOTOS_PER_JOB ฝั่ง server */
export const MAX_PHOTOS_PER_JOB = 10;

/** มอบหมายได้สูงสุดกี่คนต่อใบงาน — ต้องตรงกับ MAX_ASSIGNEES_PER_JOB ฝั่ง server */
export const MAX_ASSIGNEES_PER_JOB = 10;

export type JobAssignee = { id: string; name: string };

export type Job = {
  id: string;
  /** รหัสใบงานที่คนอ่านได้ เช่น "Jun004" — คนละตัวกับ id ที่เป็นรหัสสุ่มของระบบ */
  jobID: string;
  taskDescription: string;
  requestedBy: string;
  taskType: string;
  room: string | null;
  property: string | null;
  status: JobStatus;
  dueDate: string | null;
  /** วันที่แจ้งงาน — ระบบบันทึกให้อัตโนมัติตอนสร้างใบงาน */
  requestDate: string;
  // 1 ใบงานมอบหมายได้หลายคน — เรียงตามลำดับที่ถูกเพิ่มเข้ามา (คนแรกสุดขึ้นก่อน)
  assignees: JobAssignee[];
  photos?: JobPhoto[]; // มาเฉพาะตอนดึงใบงานเดียว (getJob) ไม่ได้มากับรายการ
};

/** ข้อความสรุปผู้รับผิดชอบสำหรับแสดงในรายการ/หัวข้อ */
export function assigneeLabel(assignees: JobAssignee[] | undefined): string {
  if (!assignees?.length) return "ยังไม่มอบหมาย";
  if (assignees.length === 1) return assignees[0].name;
  return `${assignees[0].name} +${assignees.length - 1}`;
}

export type DashboardSummary = {
  total: number;
  onProcess: number;
  done: number;
  cancelled: number;
  recentJobs: Job[];
  byTaskType: { taskType: string; count: number }[];
  last7Days: { date: string; count: number }[];
  byAssignee: { name: string; count: number }[];
};

export type DateRange = { from?: string; to?: string }; // "YYYY-MM-DD"

function rangeQuery(range?: DateRange) {
  const query = new URLSearchParams();
  if (range?.from) query.set("from", range.from);
  if (range?.to) query.set("to", range.to);
  return query.toString() ? `?${query.toString()}` : "";
}

export function getDashboard(hotelId: string, range?: DateRange) {
  return apiFetch<DashboardSummary>(`/hotels/${hotelId}/dashboard${rangeQuery(range)}`);
}

/** URL ของไฟล์ CSV — ใช้เปิด/ดาวน์โหลดตรงๆ ไม่ผ่าน apiFetch เพราะ response เป็นไฟล์ ไม่ใช่ JSON */
export function jobsCsvUrl(hotelId: string, range?: DateRange) {
  const base = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${base}/hotels/${hotelId}/dashboard/export.csv${rangeQuery(range)}`;
}

export type JobsPage = {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type ListJobsParams = {
  status?: JobStatus;
  search?: string;
  page?: number;
  limit?: number;
  /** ประเภทงาน (ตรงตัวอักษร) — ค่ามาจาก listJobTaskTypes */
  taskType?: string;
  /** "me" = เฉพาะงานที่มอบหมายให้ตัวเอง */
  assignedTo?: "me" | string;
};

export function listJobs(hotelId: string, params?: ListJobsParams) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.taskType) query.set("taskType", params.taskType);
  if (params?.assignedTo) query.set("assignedTo", params.assignedTo);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<JobsPage>(`/hotels/${hotelId}/jobs${qs}`);
}

/** ประเภทงานที่ใช้จริงในโรงแรมนี้ พร้อมจำนวนงาน — ใช้เติมตัวเลือกในแผงกรอง */
export function listJobTaskTypes(hotelId: string) {
  return apiFetch<{ taskType: string; count: number }[]>(`/hotels/${hotelId}/jobs/task-types`);
}

export function getJob(hotelId: string, jobId: string) {
  return apiFetch(`/hotels/${hotelId}/jobs/${jobId}`);
}

export function createJob(
  hotelId: string,
  data: {
    taskDescription: string;
    requestedBy: string;
    taskType: string;
    room?: string;
    property?: string;
    dueDate?: string; // ISO string
    photoUrls?: string[]; // แนบได้หลายรูปตั้งแต่ตอนสร้าง
    assigneeIds?: string[]; // มอบหมายผู้รับผิดชอบได้ตั้งแต่ตอนสร้าง และมากกว่า 1 คน
  }
) {
  return apiFetch<Job>(`/hotels/${hotelId}/jobs`, { method: "POST", body: data });
}

/** ตั้งผู้รับผิดชอบทั้งชุด (แทนที่ของเดิม) — ส่ง [] เพื่อล้างผู้รับผิดชอบทั้งหมด */
export function setJobAssignees(hotelId: string, jobId: string, assigneeIds: string[]) {
  return apiFetch<Job>(`/hotels/${hotelId}/jobs/${jobId}/assignees`, {
    method: "PUT",
    body: { assigneeIds },
  });
}

// อัปเดตงานแบบยืดหยุ่น — ใช้ทั้งเปลี่ยนสถานะ, แก้รายละเอียด, ตั้ง/ล้างวันที่เสร็จ ในฟังก์ชันเดียว
// (ผู้รับผิดชอบและรูปภาพแยกไปใช้ setJobAssignees/addJobPhoto เพราะเป็นหลายรายการ ไม่ใช่ค่าเดียวที่เขียนทับกันได้)
export type UpdateJobInput = Partial<{
  status: JobStatus;
  dueDate: string | null; // ส่ง null เพื่อล้างวันที่เสร็จ
  taskDescription: string;
  room: string;
  property: string;
}>;

export function updateJob(hotelId: string, jobId: string, data: UpdateJobInput) {
  return apiFetch<Job>(`/hotels/${hotelId}/jobs/${jobId}`, { method: "PATCH", body: data });
}

export function addNote(hotelId: string, jobId: string, body: string) {
  return apiFetch(`/hotels/${hotelId}/jobs/${jobId}/notes`, { method: "POST", body: { body } });
}

export function addSubtask(hotelId: string, jobId: string, title: string) {
  return apiFetch(`/hotels/${hotelId}/jobs/${jobId}/subtasks`, { method: "POST", body: { title } });
}

export function toggleSubtask(hotelId: string, jobId: string, subtaskId: string) {
  return apiFetch(`/hotels/${hotelId}/jobs/${jobId}/subtasks/${subtaskId}/toggle`, {
    method: "PATCH",
  });
}

// ---- รูปหน้างาน (หลายรูปต่อใบงาน) ----

/** ผูกรูปที่อัปโหลดแล้ว (path จาก uploadPhoto) เข้ากับใบงาน */
export function addJobPhoto(hotelId: string, jobId: string, url: string) {
  return apiFetch<JobPhoto>(`/hotels/${hotelId}/jobs/${jobId}/photos`, {
    method: "POST",
    body: { url },
  });
}

export function deleteJobPhoto(hotelId: string, jobId: string, photoId: string) {
  return apiFetch<void>(`/hotels/${hotelId}/jobs/${jobId}/photos/${photoId}`, { method: "DELETE" });
}

// ลบงานถาวร — server บังคับว่าต้องเป็น Admin ของโรงแรมเท่านั้นถึงจะเรียกสำเร็จ
export function deleteJob(hotelId: string, jobId: string) {
  return apiFetch<void>(`/hotels/${hotelId}/jobs/${jobId}`, { method: "DELETE" });
}
