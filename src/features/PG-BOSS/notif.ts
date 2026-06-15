import { db } from "../../db/db_index";
import { categories, departments, penindakDetails, reports, userRoles, users } from "../../db/schema";
import { ForADay_Channel_ID, PenindakCreated_Channel_ID, pushNotifForUser, ReportRevision_Channel_ID, ReportRejected_Channel_ID, pushNotifForUsers, ReportCreated_Channel_ID, ReportInProgress_Channel_ID, ReportResolved_Channel_ID, ReportRevisioned_Channel_ID } from "../firebase/utils";
import { eq, count, lt, ne, and } from "drizzle-orm";



// Status
//   "pending",
//   "in_progress",
//   "resolved",
//   "revision",
//   "rejected",


// Template 
// Feedback
// Mahasiswa
// if status -> "in_progress"
// title: "Laporan Sedang Diproses",
// body: "Laporan Anda dengan judul {reportTitle} sedang ditindaklanjuti oleh penindak. Pantau perkembangan terbaru pada aplikasi."
// if status -> "resolved"
// title: "Laporan Telah Ditindak",
// body: "Laporan Anda dengan judul {reportTitle} sudah ditindaklanjuti oleh penindak. Lihat detail pada aplikasi."
// if status -> "revision"
// title: "Laporan Tambahan Diperlukan",
// body: "Laporan Anda dengan judul {reportTitle} memerlukan revisi dan tambahan data. Lihat detail dan perbaiki laporan pada aplikasi."
// if status -> "rejected"
// title: "Laporan Anda Ditolak",
// body: "Laporan Anda dengan judul {reportTitle} ditolak oleh penindak. Lihat detail penolakan laporan pada aplikasi."

export async function reportInProgress(reportId: number) {
    let report = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        columns:{
            title: true
        },
        with: {
            author:{
                columns:{
                    id: true
                }
            }
        }
    })
    if (report==null){
        console.log("reportInProgress, report not found");
        return;
    }
    let title = "Laporan Sedang Diproses";
    let body = `Laporan Anda dengan judul ${report.title} sedang ditindaklanjuti oleh penindak. Pantau perkembangan terbaru pada aplikasi.`;
    await pushNotifForUser(
        report.author.id,
        title,
        body,
        "report_urgent",
        {
            id: ReportInProgress_Channel_ID
        }
    );
}

export async function reportResolved(reportId: number) {
    let report = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        columns:{
            title: true
        },
        with: {
            author:{
                columns:{
                    id: true
                }
            }
        }
    })
    if (report==null){
        console.log("reportResolved, report not found");
        return;
    }
    let title = "Laporan Telah Ditindak";
    let body = `Laporan Anda dengan judul ${report.title} sudah ditindaklanjuti oleh penindak. Lihat detail pada aplikasi.`;
    await pushNotifForUser(
        report.author.id,
        title,
        body,
        "report_urgent",
        {
            id: ReportResolved_Channel_ID
        }
    );
}
export async function reportRevision(reportId: number) {
    let report = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        columns:{
            title: true
        },
        with: {
            author:{
                columns:{
                    id: true
                }
            }
        }
    })
    if (report==null){
        console.log("reportRevision, report not found");
        return;
    }
    let title = "Laporan Tambahan Diperlukan";
    let body = `Laporan Anda dengan judul ${report.title} memerlukan revisi dan tambahan data. Lihat detail dan perbaiki laporan pada aplikasi.`;
    await pushNotifForUser(
        report.author.id,
        title,
        body,
        "report_urgent",
        {
            id: ReportRevision_Channel_ID
        }
    );
}
export async function reportRejected(reportId: number) {
    let report = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        columns:{
            title: true
        },
        with: {
            author:{
                columns:{
                    id: true
                }
            }
        }
    })
    if (report==null){
        console.log("reportRejected, report not found");
        return;
    }
    let title = "Laporan Anda Ditolak";
    let body = `Laporan Anda dengan judul ${report.title} ditolak oleh penindak. Lihat detail penolakan laporan pada aplikasi.`;
    await pushNotifForUser(
        report.author.id,
        title,
        body,
        "report_urgent",
        {
            id: ReportRejected_Channel_ID.toString()
        }
    );
}

// Template
// Report 
// Penindak
// if report created
// title: "Laporan Baru: {reportCategory}"
// body: "Terdapat laporan baru yang memerlukan tindak lanjut. Segera periksa detail laporan."
// if status => "revision" -> "pending"
// title: "Laporan Telah Direvisi"
// body: "Laporan dengan judul {reportTitle} telah direvisi. Segera periksa detail balasan laporan."

export async function onReportCreated(departmentId: number, reportCategoryId: number, reportTitle: string){
    const penindakRole = await db.query.userRoles.findFirst({
        where: eq(userRoles.name, "PENINDAK")
    });
    const category = await db.query.categories.findFirst({
        where: eq(categories.id, reportCategoryId)
    })
    let title = `Laporan Baru: ${category?.name}`;
    let body = `Terdapat laporan baru dengan judul ${reportTitle} yang memerlukan tindak lanjut. Segera periksa detail laporan.`
    let penindaks = await db.query.penindakDetails.findMany({
        with:{
            user:{
                columns:{
                    id: true
                }
            }
        },
        columns:{
        },
        where: eq(penindakDetails.departmentId, departmentId)
    });
    for (let i = 0; i < penindaks.length; i++){
        await pushNotifForUser(
            penindaks[i]!.user.id,
            title,
            body,
            "report_urgent",
            {
                id: ReportCreated_Channel_ID
            }
        );
    }
}

export async function onRevisionAnswered(reportId: number){
    const report = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        columns: {
            title: true
        },
        with: {
            department: {
                columns: {
                    id: true
                }
            }
        }
    })
    if (report==null)return;
    let penindaks = await db.query.penindakDetails.findMany({
        with:{
            user:{
                columns:{
                    id: true
                }
            }
        },
        columns:{
        },
        where: eq(penindakDetails.departmentId, report.department.id)
    });
    let title = "Laporan Telah Direvisi";
    let body = `Laporan dengan judul ${report!.title} telah direvisi. Segera periksa detail balasan laporan.`;
    for (let i = 0; i < penindaks.length; i++){
        await pushNotifForUser(
            penindaks[i]!.user.id,
            title,
            body,
            "report_urgent",
            {
                id: ReportRevisioned_Channel_ID
            }
        );
    }
}

// Template
// Admin
// on Penindak Created
// title: "Penindak Baru Terdaftar"
// body: "Penindak baru dengan name {penindakName} berhasil dibuat oleh {adminName}."

export async function notifToAdmin(penindakName: string, adminName: string, adminId: string) {
    const adminRole = await db.query.userRoles.findFirst({
        where: eq(userRoles.name, "ADMIN")
    });

    const admins = await db.query.users.findMany({
        where: and(
            eq(users.userRoleId, adminRole!.id),
            ne(users.id, adminId)
        ),
        columns:{
            id: true
        }
    });
    let title = "Penindak Baru Terdaftar";
    let body =  `Penindak baru dengan name ${penindakName} berhasil dibuat oleh ${adminName}.`;
    for (let i = 0; i < admins.length; i++){
        await pushNotifForUser(
            admins[i]!.id,
            title,
            body,
            "report_urgent",
            {
                id: PenindakCreated_Channel_ID
            }
        );
    }
}

// Template
// Cron Job
// Mahasiswa on not login for a day
// title: "Pantau Aspirasi"
// body: "Hi {mahasiswaName}. Pantau aspirasi yang ada dengan aplikasi Suara Mawa"
// Penindak on not login for a day
// title: "Tinjau Laporan yang Menunggu"
// body: "Hi {penindakName}. Pantau aspirasi dan pilih tindak lanjut yang ada dengan aplikasi Suara Mawa"
// Admin on not login for a day
// title: "Monitoring Laporan Harian"
// body: "Periksa perkembangan laporan dan aktivitas penanganan pada dashboard admin."
export async function notLoginForADay(){
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const selectedUsers = await db.query.users.findMany({
        where:lt(users.lastLogin, oneDayAgo),
        columns:{
            id: true,
            name: true
        },
        with:{
            userRole:{
                columns:{
                    name: true
                },
            },
            penindakDetails:{
                columns:{
                    departmentId: true
                }
            }
        }
    });
    const report_counts = await db
        .select({
            departmentId: departments.id,
            reportCount: count(reports.id),
        })
        .from(departments)
        .leftJoin(
            reports,
            eq(reports.departmentId, departments.id)
        )
        .groupBy(departments.id, departments.name);
    for (let i = 0; i < selectedUsers.length; i++){
        let title;
        let body;
        switch (selectedUsers[i]?.userRole.name){
            case "MAHASISWA":
                title = "Pantau Aspirasi";
                body = `Hi ${selectedUsers[i]?.name}. Pantau aspirasi yang ada dengan aplikasi Suara Mawa`
                break;
            case "PENINDAK":
                title = "Tinjau Laporan yang Menunggu";
                body = `Hi ${selectedUsers[i]?.name}. Terdapat ${report_counts.find( report => report.departmentId==selectedUsers[i]?.penindakDetails?.departmentId )?.reportCount} laporan yang menunggu. Pantau aspirasi dan pilih tindak lanjut yang ada dengan aplikasi Suara Mawa`
                break;
            case "ADMIN":
                title = "Monitoring Laporan Harian";
                body = `Hi ${selectedUsers[i]?.name}. Periksa perkembangan laporan dan aktivitas penanganan pada dashboard admin.`
                break;
            default:
                continue;
        }
        await pushNotifForUser(
            selectedUsers[i]!.id,
            title,
            body,
            "report_general",
            {
                id: ForADay_Channel_ID
            }
        );
    }
}