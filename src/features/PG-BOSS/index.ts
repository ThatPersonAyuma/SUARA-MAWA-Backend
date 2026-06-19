import Elysia, { status, t } from "elysia";
import { PgBoss, states } from "pg-boss";
import { eq, desc } from "drizzle-orm";
import { pushNotifForUser } from "../firebase/utils";
import { notifToAdmin, notLoginForADay, onReportCreated, onRevisionAnswered, reportInProgress, reportRejected, reportResolved, reportRevision } from "./notif";
import { db } from "../../db/db_index";
import { reportStatus } from "../../db/schema";

export const boss = new PgBoss({
    connectionString: process.env.DATABASE_URL
});

export async function initQueue() {
    await boss.start();
    console.log('start');
    await boss.createQueue('do-work');
    await boss.createQueue('do-notify');
    await boss.createQueue('daily-reminder');
    await boss.work(
        'daily-reminder',
        async (job)=>{
            await notLoginForADay();
        }
    )
    boss.on('error', error => console.log(error));
    boss.on('warning', ({ message, data }) => {
        console.log('pg-boss warning:', message, data);
    });
    await boss.work(
        'do-work', 
        { batchSize: 1 }, // Force to just take a job at once
        async (job)=>{
        // Example job data : [{"id":"b520cdcc-4b3a-4efb-a873-aad3b3270d1f","name":"do-work",
        // "data":{"to":"user@example.com","template":"welcome"},"expireInSeconds":900,"heartbeatSeconds":null,"groupId":null,"groupTier":null,"signal":{}}]
        console.log(`Job: ${JSON.stringify(job[0])}`);
        return { status: 'sukses' };
    });
    await boss.work(
        'do-notify', 
        { batchSize: 1 }, // Force to just take a job at once
        async (job)=>{
        // Example job data : [{"id":"b520cdcc-4b3a-4efb-a873-aad3b3270d1f","name":"do-work",
        // "data":{"to":"user@example.com","template":"welcome"},"expireInSeconds":900,"heartbeatSeconds":null,"groupId":null,"groupTier":null,"signal":{}}]
        console.log(`Job: ${JSON.stringify(job[0]?.data)}`);
        const data = job[0]?.data as Record<string, string>;
        console.log("userId: ", data["userId"]);
        if (data==null) return;
        pushNotifForUser(
            // @ts-expect-error
            data["userId"],
            data["title"],
            data["body"],
            data["channelId"],
            data["data"]
        )
        return { status: 'sukses' };
    });
    await boss.schedule(
        'daily-reminder',
        '0 3 * * *',
        {
            request: 'run',
            interval: 'daily',
        }
    );
    await boss.createQueue('notif-to-admin');
    await boss.work(
        'notif-to-admin',
        { batchSize: 1 },
        async (job)=>{
            const data = job[0]?.data as Record<string, string>;
            if (data['penindakName']==null){
                console.log("Error on notif-to-admin, ensure data is correct")
            }
            await notifToAdmin(
                // @ts-expect-error
                data['penindakName'],
                data['adminName'],
                data['adminId']
            );
        }
    );
    await boss.createQueue('on-report-created');
    await boss.work(
        'on-report-created',
        { batchSize: 1 },
        async (job)=>{
            const data = job[0]?.data as Record<string, any>;
            console.log("Creation Notif")
            if (data['departmentId']==null){
                console.log("Error on on-report-created, ensure data is correct")
            }
            await onReportCreated(
                data['departmentId'],
                data['reportCategoryId'],
                data['reportTitle']
            );
        }
    );
    await boss.createQueue('on-reportStatus-changed');
    await boss.work(
        'on-reportStatus-changed',
        { batchSize: 1 },
        async (job)=>{
            const data = job[0]?.data as Record<string, any>;
            console.log('changed');
            if (data['reportId']==null){
                console.log("Error on on-reportStatus-changed, ensure data is correct")
                return;
            }
            // Fetch the last 2 statuses to determine the state transition.
            // Index 0 = newest (just inserted), index 1 = previous.
            const latestStatuses = await db.select({
                    status: reportStatus.status
                })
                .from(reportStatus)
                .where(eq(reportStatus.reportId, data['reportId']))
                .orderBy(desc(reportStatus.changedAt))
                .limit(2);

            if (latestStatuses == null || latestStatuses.length === 0) return;

            const currentStatus = latestStatuses[0]?.status;
            const previousStatus = latestStatuses.length > 1 ? latestStatuses[1]?.status : null;

            // Transition: revision → pending means the student answered the revision request.
            if (previousStatus === "revision" && currentStatus === "pending") {
                await onRevisionAnswered(data['reportId']);
                return;
            }

            // Otherwise, dispatch notification based on the new (current) status.
            switch (currentStatus) {
                case "in_progress":
                    await reportInProgress(data['reportId']);
                    break;
                case "resolved":
                    await reportResolved(data['reportId']);
                    break;
                case "revision":
                    await reportRevision(data['reportId']);
                    break;
                case "rejected":
                    await reportRejected(data['reportId']);
                    break;
            }
        }
    );
}
// "report_urgent"|"report_general"
export async function setupPgBoss(app: Elysia){
    app.get('/do-work', async ()=>{
        const jobId = await  boss.send(
            'do-work',
            { to: 'user@example.com', template: 'welcome' });
        console.log(`Job dikirim dengan ID: ${jobId}`);
    })
    .post('/send-notification/urgent', async ({body: {userId, title, body, data}})=>{
        try{
            boss.send('do-notify', {
                userId: userId,
                channelId: "report_urgent",
                title: title,
                body: body,
                data: data
            })
            return status(200);
        }catch(e){
            return status(500, {
                error: e
            })
        }
    },{
        body: t.Object({
            userId: t.String(),
            title: t.String(),
            body: t.String(),
            data: t.Optional(t.Record(t.String(),t.String()))
        })
    })
    .post('/send-notification/general', async ({body: {userId, title, body, data}})=>{
        try{
            boss.send('do-notify', {
                userId: userId,
                channelId: "report_general",
                title: title,
                body: body,
                data: {
                    id: "123"
                }
            })
            return status(200);
        }catch(e){
            return status(500, {
                error: e
            })
        }
    },{
        body: t.Object({
            userId: t.String(),
            title: t.String(),
            body: t.String(),
            data: t.Optional(t.Record(t.String(),t.String()))
        })
    })
    .post('/test/notify', ({body: {}, user})=>{
        
    }, {
        auth: true,
        body: t.Object({
        })
    })
    await initQueue();
}
