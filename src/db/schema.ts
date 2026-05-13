// Perlu revisi bagian foreign key { onDelete: "cascade" }
// relations(users, ({ one, many }) => ({}));
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

/* #region Enums */
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
/* #endregion */

/* #region Lookup / reference tables */
export const userRoles = pgTable("user_roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const departments = pgTable("departments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const files = pgTable("files", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  filetype: fileTypeEnum().notNull(),
});
/* #endregion */

/* #region Users */
export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  password: varchar({ length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull().unique(),
  userRoleId: integer("user_role_id")
    .notNull()
    .references(() => userRoles.id),
  lastLogin: timestamp("last_login").notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 255 }).notNull().unique(),
  photoProfileId: integer("photo_profile_id")
    .references(() => files.id)
    .unique(),
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
});
/* #endregion */

/* #region User detail tables */
export const mahasiswaDetails = pgTable("mahasiswa_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  nim: integer().notNull().unique(),
});

export const adminDetails = pgTable("admin_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
});

export const penindakDetails = pgTable("penindak_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  nik: varchar({ length: 255 }).notNull().unique(),
});
/* #endregion */

/* #region Reports */
export const reports = pgTable("reports", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  locationLat: doublePrecision("location_lat").notNull(),
  locationLong: doublePrecision("location_long").notNull(),
  isPublic: boolean("is_public").notNull(),
  isDeleted: boolean("is_deleted").notNull(),
  likes: integer().notNull(),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
});

export const reportEvidences = pgTable("report_evidences", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id),
  fileId: integer("file_id")
    .notNull()
    .references(() => files.id)
    .unique(),
});
/* #endregion */

/* #region Report status & feedback */
export const reportStatus = pgTable("report_status", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id),
  status: reportStatusEnum().notNull(),
  changedById: integer("changed_by_id")
    .notNull()
    .references(() => users.id),
  changedAt: timestamp("changed_at").notNull(),
});

export const feedbacks = pgTable("feedbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportStatusId: integer("report_status_id")
    .notNull()
    .references(() => reportStatus.id)
    .unique(),
  description: text(),
});

export const feedbackAttachments = pgTable("feedback_attachments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  feedbackId: integer("feedback_id")
    .notNull()
    .references(() => feedbacks.id),
  fileId: integer("file_id")
    .notNull()
    .references(() => files.id)
    .unique(),
});
/* #endregion */

/* #region Comments */
export const comments = pgTable("comments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  comment: text().notNull(),
});
/* #endregion */


/* #region Relations */
/* #region userRoles Relations */
export const userRolesRelationship = relations(userRoles, ({ many }) => ({
  users: many(users)
}));
/* #endregion */

/* #region Departments Relations */
export const departmentsRelations = relations(departments, ({ many }) => ({
  penindakDetails: many(penindakDetails),
  reports: many(reports)
}));
/* #endregion */

/* #region Categories Relations */
export const categoriesRelations = relations(categories, ({ many }) => ({
  reports: many(reports)
}));
/* #endregion */

/* #region Files Relations */
export const filesRelations = relations(files, ({ one }) => ({
  userProfile: one(users, {
    fields: [files.id],
    references: [users.photoProfileId],
  }),
  reportEvidence: one(reportEvidences, {
    fields: [files.id],
    references: [reportEvidences.fileId],
  }),
  feedbackAttachment: one(feedbackAttachments, {
    fields: [files.id],
    references: [feedbackAttachments.fileId],
  })
}));
/* #endregion */

/* #region  Users Relations */
export const usersRelations = relations(users, ({ one, many }) => ({
  // One-to-One Relationships
  mahasiswaDetail: one(mahasiswaDetails, {
    fields: [users.id],
    references: [mahasiswaDetails.userId],
  }),
  penindakDetail: one(penindakDetails, {
    fields: [users.id],
    references: [penindakDetails.userId],
  }),
  adminDetail: one(adminDetails, {
    fields: [users.id],
    references: [adminDetails.userId],
  }),
  userRole: one(userRoles, {
    fields: [users.userRoleId],
    references: [userRoles.id]
  }),
  photoProfile: one(files, {
    fields: [users.photoProfileId],
    references: [files.id]
  }),


  // One-to-Many Relationship
  reports: many(reports),
  reportStatus: many(reportStatus),
  comments: many(comments)
}));
/* #endregion */

/* #region  Details Relationship*/
export const mahasiswaDetailsRelations = relations(mahasiswaDetails, ({ one }) => ({
  user: one(users, {
    fields: [mahasiswaDetails.userId],
    references: [users.id],
  }),
}));
export const penindakDetailsRelations = relations(penindakDetails, ({ one }) => ({
  user: one(users, {
    fields: [penindakDetails.userId],
    references: [users.id],
  }),
}));
export const adminDetailsRelations = relations(adminDetails, ({ one }) => ({
  user: one(users, {
    fields: [adminDetails.userId],
    references: [users.id],
  }),
}));
/* #endregion */

/* #region Report Relations */
export const reportsRelations = relations(reports, ({ one, many }) => ({
  author: one(users, {
    fields: [reports.authorId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [reports.departmentId],
    references: [departments.id],
  }),
  category: one(categories, {
    fields: [reports.categoryId],
    references: [categories.id],
  }),

  // many 
  reportStatus: many(reportStatus),
  comments: many(comments),
  reportEvidences: many(reportEvidences)
}));
/* #endregion */

/* #region Report Evidences Relations */
export const reportEvidencesRelations = relations(reportEvidences, ({ one }) => ({
  file: one(files, {
    fields: [reportEvidences.fileId],
    references: [files.id],
  }),
  report: one(reports, {
    fields: [reportEvidences.reportId],
    references: [reports.id],
  })
}));
/* #endregion */

/* #region Report Status Relations */
export const reportStatusRelations = relations(reportStatus, ({ one }) => ({
  report: one(reports, {
    fields: [reportStatus.reportId],
    references: [reports.id],
  }),
  changedById: one(users, {
    fields: [reportStatus.changedById],
    references: [users.id],
  }),
  feedback: one(feedbacks, {
    fields: [reportStatus.id],
    references: [feedbacks.reportStatusId],
  })
}));
/* #endregion */

/* #region Feedback Relations */
export const feedbackRelations = relations(feedbacks, ({ one, many }) => ({
  reportStatus: one(reportStatus, {
    fields: [feedbacks.reportStatusId],
    references: [reportStatus.id],
  }),

  feedbackAttachments: many(feedbackAttachments),
}));
/* #endregion */

/* #region Feedback Attachments Relations */
export const feedbackAttachmentsRealations = relations(feedbackAttachments, ({ one }) => ({
  feedback: one(feedbacks, {
    fields: [feedbackAttachments.feedbackId],
    references: [feedbacks.id],
  }),
  file: one(files, {
    fields: [feedbackAttachments.fileId],
    references: [files.id],
  }),
}));
/* #endregion */

/* #region Comments Relations */
export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  report: one(reports, {
    fields: [comments.reportId],
    references: [reports.id],
  }),
}));
/* #endregion */
/* #endregion */