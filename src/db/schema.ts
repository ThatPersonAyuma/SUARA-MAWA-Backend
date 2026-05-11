// Perlu revisi bagian foreign key { onDelete: "cascade" }
import {
  boolean,
  timestamp,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const reportStatusEnum = pgEnum("report_status_enum", [
  "pending",
  "in_progress",
  "resolved",
  "revision",
  "rejected",
]);

export const fileTypeEnum = pgEnum("file_type_enum", [
  "image",
  "video",
  "document",
]);

// ─── Lookup / reference tables ────────────────────────────────────────────────

export const userRolesTable = pgTable("user_roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const departmentsTable = pgTable("departments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const categoriesTable = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const filesTable = pgTable("files", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  filetype: fileTypeEnum().notNull(),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  password: varchar({ length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull().unique(),
  userRoleId: integer("user_role_id")
    .notNull()
    .references(() => userRolesTable.id),
  lastLogin: timestamp("last_login").notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 255 }).notNull().unique(),
  photoProfileId: integer("photo_profile_id")
    .references(() => filesTable.id),
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
});
// ─── User Deatils Relationship─────────────────────────────────────────────────
export const mahasiswaRelations = relations(usersTable, ({ one }) => ({
	mahasiswaDetailsTable: one(mahasiswaDetailsTable),
}));
export const penindakRelations = relations(usersTable, ({ one }) => ({
	penindakDetailsTable: one(penindakDetailsTable),
}));
export const adminRelations = relations(usersTable, ({ one }) => ({
	adminDetailsTable: one(adminDetailsTable),
}));

// ─── User detail tables ───────────────────────────────────────────────────────

export const mahasiswaDetailsTable = pgTable("mahasiswa_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id),
  nim: integer().notNull().unique(),
});

export const adminDetailsTable = pgTable("admin_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id),
});

export const penindakDetailsTable = pgTable("penindak_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departmentsTable.id),
  nik: varchar({ length: 255 }).notNull().unique(),
});

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsTable = pgTable("reports", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  locationLat: doublePrecision("location_lat").notNull(),
  locationLong: doublePrecision("location_long").notNull(),
  isPublic: boolean("is_public").notNull(),
  isDeleted: boolean("is_deleted").notNull(),
  likes: integer().notNull(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => departmentsTable.id),
  officerId: integer("officer_id")
    .notNull()
    .references(() => usersTable.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id),
});

export const reportEvidencesTable = pgTable("report_evidences", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reportsTable.id),
  fileId: integer("file_id")
    .notNull()
    .references(() => filesTable.id),
});

// ─── Report status & feedback ─────────────────────────────────────────────────

export const reportStatusTable = pgTable("report_status", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reportsTable.id),
  status: reportStatusEnum().notNull(),
  changedBy: integer("changed_by")
    .notNull()
    .references(() => usersTable.id),
  changedAt: timestamp("changed_at").notNull(),
});

export const feedbacksTable = pgTable("feedbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportStatusId: integer("report_status_id")
    .notNull()
    .references(() => reportStatusTable.id),
  description: text(),
});

export const feedbackAttachmentsTable = pgTable("feedback_attachments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  feedbackId: integer("feedback_id")
    .notNull()
    .references(() => feedbacksTable.id),
  fileId: integer("file_id")
    .notNull()
    .references(() => filesTable.id),
});

// ─── Comments ─────────────────────────────────────────────────────────────────

export const commentsTable = pgTable("comments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reportsTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  comment: text().notNull(),
});
// import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

// export const usersTable = pgTable("users", {
//     id: integer().primaryKey().generatedAlwaysAsIdentity(),
//     name: varchar({ length: 255 }).notNull(),
//     age: integer().notNull(),
//     email: varchar({ length: 255 }).notNull().unique(),
// });
