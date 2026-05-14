import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users, userRoles, departments, categories, files, mahasiswaDetails, adminDetails, penindakDetails, reports, reportEvidences, reportStatus, feedbacks, feedbackAttachments, comments } from "./schema";

// --- USER ROLES ---
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const selectUserRoleSchema = createSelectSchema(userRoles);

// --- DEPARTMENTS ---
export const insertDepartmentSchema = createInsertSchema(departments);
export const selectDepartmentSchema = createSelectSchema(departments);

// --- CATEGORIES ---
export const insertCategorySchema = createInsertSchema(categories);
export const selectCategorySchema = createSelectSchema(categories);

// --- FILES ---
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

// --- USERS (With Custom Logic) ---
export const insertUserSchema = createInsertSchema(users, {
  email: z.email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  fullName: z.string().min(3, "Nama lengkap terlalu pendek"),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid E.164 phone number, use +{country code} rest"),
}).pick({
    password: true,
    fullName:  true,
    email: true,
    phoneNumber: true,
});

export const selectUserSchema = createSelectSchema(users);
export const updateUserSchema = createSelectSchema(users, {
  email: z.email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  fullName: z.string().min(3, "Nama lengkap terlalu pendek"),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid E.164 phone number"),
}).pick({
    id: true,
    password: true,
    fullName:  true,
    email: true,
    phoneNumber: true,
});

// Schema khusus untuk login
export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

// Mahasiswa
export const insertMahasiswaSchema = createInsertSchema(mahasiswaDetails).pick({
  userId: true,
  nim: true,
}).extend({
  nim: z.number().min(100000, "NIM tidak valid"),
});

// Admin
export const insertAdminSchema = createInsertSchema(adminDetails).pick({
  userId: true,
});

// Penindak (Dosen/Staff)
export const insertPenindakSchema = createInsertSchema(penindakDetails).pick({
  userId: true,
  departmentId: true,
  nik: true,
}).extend({
  nik: z.string().min(5, "NIK harus diisi"),
});
// Report - Fokus pada input dari Form Pelaporan
export const insertReportSchema = createInsertSchema(reports).pick({
  title: true,
  description: true,
  locationLat: true,
  locationLong: true,
  isPublic: true,
  departmentId: true,
  categoryId: true,
}).extend({
  title: z.string().min(10, "Judul terlalu singkat").max(255),
  description: z.string().min(20, "Deskripsi harus lebih detail"),
});

// Evidence (Biasanya ID File didapat setelah upload)
export const insertReportEvidenceSchema = createInsertSchema(reportEvidences).pick({
  reportId: true,
  fileId: true,
});
// Status Update
export const insertReportStatusSchema = createInsertSchema(reportStatus).pick({
  reportId: true,
  status: true,
  changedById: true,
});

// Feedback (Tanggapan terhadap laporan)
export const insertFeedbackSchema = createInsertSchema(feedbacks).pick({
  reportStatusId: true,
  description: true,
}).extend({
  description: z.string().min(5, "Tanggapan harus diisi"),
});

export const insertFeedbackAttachmentSchema = createInsertSchema(feedbackAttachments).pick({
  feedbackId: true,
  fileId: true,
});
export const insertCommentSchema = createInsertSchema(comments).pick({
  reportId: true,
  userId: true,
  comment: true,
}).extend({
  comment: z.string().min(1, "Komentar tidak boleh kosong").max(500),
});