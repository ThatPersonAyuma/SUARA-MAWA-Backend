import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, integer, varchar, pgEnum, doublePrecision } from "drizzle-orm/pg-core";

/* #region Enums */
export const DEFAULT_REPORT_STATUS = "pending";
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
// User roles=> ["Mahasiswa", "Admin", "Penindak"]
export const userRoles = pgTable("user_roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

// Departements => ["Kemahasiswaan", "TU"]
export const departments = pgTable("departments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

// Categories => ["Prasarana", "Mata Kuliah", "Pengajar"]
export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().unique(),
});

export const files = pgTable("files", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  filetype: fileTypeEnum().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  userRoleId: integer("user_role_id")
    .notNull()
    .references(() => userRoles.id),
  photoProfileId: integer("photo_profile_id")
    .references(() => files.id)
    .unique(),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  lastLogin: timestamp("last_login"),
});


export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const jwks = pgTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").notNull(),
  expiresAt: timestamp("expires_at"),
});

export const mahasiswaDetails = pgTable("mahasiswa_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  nim: varchar({ length: 255 }).notNull().unique(),
});

export const adminDetails = pgTable("admin_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  nik: varchar({ length: 255 }).notNull().unique(),
});

export const penindakDetails = pgTable("penindak_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
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
  locationDetail: text("location_detail"),
  isPublic: boolean("is_public").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  likes: integer().default(0).notNull(),
  authorId: text("author_id")
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
  changedById: text("changed_by_id")
    .notNull()
    .references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const feedbacks = pgTable("feedbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reportStatusId: integer("report_status_id")
    .notNull()
    .references(() => reportStatus.id)
    .unique(),
  description: text().notNull(),
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
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  comment: text().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
/* #endregion */

/* #region  Users Relations */
export const usersRelations = relations(users, ({ one, many }) => ({
  // Relasi Internal Better Auth / OAuth
  sessions: many(session),
  accounts: many(account),

  // Relasi ke tabel Bisnis / Aplikasi yang sudah kamu buat di file lain
  userRole: one(userRoles, {
    fields: [users.userRoleId], // Sesuaikan nama kolom roleId di tabel users kamu
    references: [userRoles.id],
  }),
  photoProfile: one(files, {
    fields: [users.photoProfileId],
    references: [files.id],
  }),

  // Relasi One-to-Many & One-to-One pendukung
  mahasiswaDetails: one(mahasiswaDetails),
  adminDetails: one(adminDetails),
  penindakDetails: one(penindakDetails),

  reports: many(reports),
  comments: many(comments),
  changedStatuses: many(reportStatus),
}));
/* #endregion */

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
  department: one(departments, {
    fields: [penindakDetails.departmentId],
    references: [departments.id],
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
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, {
    fields: [account.userId],
    references: [users.id],
  }),
}));