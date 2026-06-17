import { db } from "./src/db/db_index";
import { users, reports, reportLikes, comments } from "./src/db/schema";
import { toggleLikeReport, addComment, getComments, getAllPublicReports, getReportDetail } from "./src/features/reports/all";
import { eq } from "drizzle-orm";

async function runTests() {
    console.log("Fetching a user and a report...");
    const user = await db.query.users.findFirst();
    const report = await db.query.reports.findFirst({ where: eq(reports.isPublic, true) });

    if (!user || !report) {
        console.log("No user or public report found.");
        process.exit(1);
    }

    console.log(`Using User ID: ${user.id}`);
    console.log(`Using Report ID: ${report.id}`);

    console.log("\n--- Testing toggleLikeReport ---");
    let likeRes = await toggleLikeReport(user.id, report.id);
    console.log("Toggle Like 1:", likeRes);

    let likesCount = await db.select().from(reportLikes).where(eq(reportLikes.reportId, report.id));
    console.log(`Likes in DB: ${likesCount.length}`);

    likeRes = await toggleLikeReport(user.id, report.id);
    console.log("Toggle Like 2:", likeRes);

    likesCount = await db.select().from(reportLikes).where(eq(reportLikes.reportId, report.id));
    console.log(`Likes in DB: ${likesCount.length}`);

    // Add like again for next tests
    await toggleLikeReport(user.id, report.id);
    let finalLike = await db.select().from(reportLikes).where(eq(reportLikes.reportId, report.id));
    console.log(`Final Like Status in DB: ${finalLike[0]?.likeStatus}`);

    console.log("\n--- Testing addComment ---");
    const commentRes = await addComment(user.id, report.id, "This is a test comment!");
    console.log("Add Comment:", commentRes);

    console.log("\n--- Testing getComments ---");
    const getCommentsRes = await getComments(report.id);
    console.log("Get Comments:", JSON.stringify(getCommentsRes, null, 2));

    console.log("\n--- Testing getAllPublicReports ---");
    const allReportsRes = await getAllPublicReports(1);
    const testReportInAll = allReportsRes.data.find(r => r.id === report.id);
    console.log(`Likes count in getAllPublicReports for report ${report.id}:`, testReportInAll?.likes);

    console.log("\n--- Testing getReportDetail ---");
    const reportDetailRes = await getReportDetail(report.id);
    console.log(`Likes count in getReportDetail for report ${report.id}:`, reportDetailRes.data?.likes);

    process.exit(0);
}

runTests().catch(console.error);
