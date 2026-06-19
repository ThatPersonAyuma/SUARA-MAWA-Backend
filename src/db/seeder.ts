import { eq, inArray } from "drizzle-orm";
import { auth } from "../features/auth/auth";
import { db } from "./db_index";
import {
    userRoles,
    departments,
    categories,
    users,
    mahasiswaDetails,
    adminDetails,
    penindakDetails,
    reports,
    reportStatus,
    comments,
    feedbacks,
    reportEvidences,
    files,
    feedbackAttachments,
    reportLikes,
} from "./schema";

async function seed() {
    console.log("Seeding database...");

    // =========================
    // Roles
    // =========================
    console.log("Inserting roles...");
    await db.insert(userRoles).values([
        { name: "MAHASISWA" },
        { name: "PENINDAK" },
        { name: "ADMIN" },
    ]).onConflictDoNothing();

    // =========================
    // Departments
    // =========================
    console.log("Inserting departments...");
    await db.insert(departments).values([
        { name: "Kemahasiswaan" },
        { name: "TU" },
    ]).onConflictDoNothing();

    // =========================
    // Categories
    // =========================
    console.log("Inserting categories...");
    await db.insert(categories).values([
        { name: "Prasarana" },
        { name: "Mata Kuliah" },
        { name: "Pengajar" },
    ]).onConflictDoNothing();

    // =========================
    // Get References
    // =========================
    const roles = await db.query.userRoles.findMany();
    const deps = await db.query.departments.findMany();
    const cats = await db.query.categories.findMany();

    const mahasiswaRole = roles.find(r => r.name === "MAHASISWA")!;
    const penindakRole = roles.find(r => r.name === "PENINDAK")!;
    const adminRole = roles.find(r => r.name === "ADMIN")!;

    const kemahasiswaan = deps.find(d => d.name === "Kemahasiswaan")!;
    const tu = deps.find(d => d.name === "TU")!;

    const prasarana = cats.find(c => c.name === "Prasarana")!;
    const mataKuliah = cats.find(c => c.name === "Mata Kuliah")!;

    // =========================
    // Users
    // =========================
    console.log("Inserting users...");
    await auth.api.signUpEmail({
        body: {
            name: "Admin Sistem",
            email: "1@mail.unej.ac.id",
            password: 'Admin123!',
            phoneNumber: "081111111111",
            userRoleId: adminRole.id,
        }
    });
    await auth.api.signUpEmail({
        body: {
            name: "Budi Santoso",
            email: "2@mail.unej.ac.id",
            phoneNumber: "082222222222",
            password: 'Mahasiswa123!',
            userRoleId: mahasiswaRole.id,
        }
    });
    await auth.api.signUpEmail({
        body: {
            name: "Siti Rahma",
            email: "3@mail.unej.ac.id",
            phoneNumber: "083333333333",
            password: 'Penindak123!',
            userRoleId: penindakRole.id,
        }
    });

    const allUsers = await db.query.users.findMany();

    const admin = allUsers.find(u => u.email === "1@mail.unej.ac.id")!;
    const mahasiswa = allUsers.find(u => u.email === "2@mail.unej.ac.id")!;
    const penindak = allUsers.find(u => u.email === "3@mail.unej.ac.id")!;

    //   verifikasi email, verifikasi phonenumber,
    // Profile
    const profiles = await db.insert(files).values([
        {
            name: "imageGweh.jpg",
            filetype: 'image',
        },
        {
            name: "mahasiswa.png",
            filetype: 'image',
        },
        {
            name: "penindak.png",
            filetype: 'image',
        },
    ]).returning({ insertedId: files.id });
    await db.update(users)
        .set({
            emailVerified: true,
            emailVerifiedAt: new Date(),
            phoneNumberVerified: true,
            photoProfileId: profiles[0]?.insertedId
        })
        .where(eq(users.id, admin.id))
    await db.update(users)
        .set({
            emailVerified: true,
            emailVerifiedAt: new Date(),
            phoneNumberVerified: true,
            photoProfileId: profiles[1]?.insertedId
        })
        .where(eq(users.id, mahasiswa.id))
    await db.update(users)
        .set({
            emailVerified: true,
            emailVerifiedAt: new Date(),
            phoneNumberVerified: true,
            photoProfileId: profiles[2]?.insertedId
        })
        .where(eq(users.id, penindak.id))
    // =========================
    // User Details
    // =========================
    console.log("Inserting user details...");

    await db.insert(adminDetails).values([
        {
            userId: admin.id,
            nik: "182212312024003",
            nip: "122333442"
        },
    ]).onConflictDoNothing();

    await db.insert(mahasiswaDetails).values([
        {
            userId: mahasiswa.id,
            nim: "220411100001",
        },
    ]).onConflictDoNothing();

    await db.insert(penindakDetails).values([
        {
            userId: penindak.id,
            nik: "198812312024001",
            departmentId: kemahasiswaan.id,
            nip: "12322132"
        },
    ]).onConflictDoNothing();

    // =========================
    // Reports
    // =========================
    console.log("Inserting reports...");

    const insertedReports = await db.insert(reports).values([
        {
            title: "Lampu Gedung Rusak",
            description:
                "Lampu di koridor gedung A mati selama beberapa hari.",
            location: "Kelas A lantai 2 Gedung utama",
            locationLat: -7.2575,
            locationLong: 112.7521,
            isPublic: true,
            isDeleted: false,
            authorId: mahasiswa.id,
            departmentId: tu.id,
            categoryId: prasarana.id,
        },
        {
            title: "Perubahan Jadwal Kuliah Mendadak",
            description:
                "Jadwal kuliah berubah tanpa pemberitahuan yang jelas.",
            location: "Mata kuliah Pembelajaran Mesin",
            locationLat: -7.2570,
            locationLong: 112.7520,
            isPublic: true,
            isDeleted: false,
            authorId: mahasiswa.id,
            departmentId: kemahasiswaan.id,
            categoryId: mataKuliah.id,
        },
    ]).returning({ returningId: reports.id });

    // =========================
    // Report Evidences
    // =========================
    console.log("Inserting report evidences files...");

    const evidenceFiles = await db.insert(files).values([
        {
            name: "lampuruask.webp",
            filetype: 'image',
        },
        {
            name: "inilampurusak.pdf",
            filetype: 'document',
        },
        {
            name: "lampuruask-doksli.mp4",
            filetype: 'video',
        },
    ]).returning({ insertedId: files.id });

    console.log("Inserting report evidences...");
    // @ts-expect-error
    await db.insert(reportEvidences).values([
        {
            reportId: insertedReports[0]?.returningId,
            fileId: evidenceFiles[0]?.insertedId
        },
        {
            reportId: insertedReports[0]?.returningId,
            fileId: evidenceFiles[1]?.insertedId
        },
        {
            reportId: insertedReports[0]?.returningId,
            fileId: evidenceFiles[2]?.insertedId
        },
    ]);

    // =========================
    // Report Status
    // =========================
    console.log("Inserting report status...");

    // @ts-expect-error
    const reportStatusIds = await db.insert(reportStatus).values([
        {
            reportId: insertedReports[0]?.returningId,
            status: "pending",
            changedById: mahasiswa.id,
        },
        {
            reportId: insertedReports[0]?.returningId,
            status: "in_progress",
            changedById: penindak.id,
        },
        {
            reportId: insertedReports[0]?.returningId,
            status: "resolved",
            changedById: penindak.id,
        },
    ]).returning({ insertedId: reportStatus.id });

    // =========================
    // Feedback
    // =========================
    console.log("Inserting feedback...");
    // @ts-expect-error
    const feedbackIds = await db.insert(feedbacks).values([
        {
            reportStatusId: reportStatusIds[1]?.insertedId,
            description: "Akan kami tindak lanjuti mohon untuk ditunggu hasilnya."
        },
        {
            reportStatusId: reportStatusIds[2]?.insertedId,
            description: "Kami sudah melakukan perbaikan pada lampu dan sudah dapat digunakan."
        },
    ]).returning({ insertedId: feedbacks.id });

    // =========================
    // Feedback Attachments
    // =========================
    console.log("Inserting feedback attachment file...");

    const faFiles = await db.insert(files).values([
        {
            name: "lampusudahfix.webp",
            filetype: 'image',
        },
    ]).returning({ insertedId: files.id });

    console.log("Inserting feedback attachment...");
    // @ts-expect-error
    await db.insert(feedbackAttachments).values([
        {
            feedbackId: feedbackIds[1]?.insertedId,
            fileId: faFiles[0]?.insertedId
        },
    ]);

    // =========================
    // Comments
    // =========================
    console.log("Inserting comments...");
    // @ts-expect-error
    await db.insert(comments).values([
        {
            reportId: insertedReports[0]?.returningId,
            userId: mahasiswa.id,
            comment: "Belum ditanggapi guys.",
        },
        {
            reportId: insertedReports[1]?.returningId,
            userId: admin.id,
            comment: "Akan segera kami hubungi.",
        },
    ]);

    // =========================
    // Report Likes
    // =========================
    console.log("Inserting report likes...");
    // @ts-expect-error
    await db.insert(reportLikes).values([
        {
            reportId: insertedReports[0]?.returningId,
            userId: mahasiswa.id,
            likeStatus: true,
        },
        {
            reportId: insertedReports[0]?.returningId,
            userId: admin.id,
            likeStatus: true,
        },
        {
            reportId: insertedReports[1]?.returningId,
            userId: penindak.id,
            likeStatus: true,
        },
    ]);

    console.log("Seed completed!");
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
/* #endregion */