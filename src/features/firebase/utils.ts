import { eq } from 'drizzle-orm';
import { db } from '../../db/db_index';
import { firebaseTokens } from '../../db/schema';
import {messaging} from './firebase';

type NotifMessage = {
    notification: {
        title: string,
        bodi: string
    },
    data: {
    click_action: string,
        id: string,
        status: string
    },
    token: string
}

export const ForADay_Channel_ID = "24";
export const PenindakCreated_Channel_ID = "11";
export const ReportCreated_Channel_ID = "12";
export const ReportRevisioned_Channel_ID = "13";
export const ReportInProgress_Channel_ID = "14";
export const ReportResolved_Channel_ID = "15";
export const ReportRevision_Channel_ID = "16";
export const ReportRejected_Channel_ID = "17";

export async function pushNotifForUser(userId: string, title: string, body: string, channelId: "report_urgent"|"report_general", data: Object){
    const registrationToken = await db.query.firebaseTokens.findMany({
        where: eq(firebaseTokens.userId, userId),
        columns: {
            id: true,
            token: true
        }
    })
    console.log(registrationToken);
    for (const tokenData of registrationToken) {
        try {
            const response = await messaging.send({
                notification: {
                    title,
                    body,
                },
                android: {
                    notification: {
                        channel_id: channelId
                    }
                },
                data,
                token: tokenData.token
            });

            console.log("Success:", response);
        } catch (error) {
            console.log("Error:", error);
        }
    }
}

export async function pushNotifForUsers(userIds: String[], title: string, body: string, channelId: "report_urgent"|"report_general", data: Object){
    for (const id in userIds){
        await pushNotifForUser(
            id,
            title,
            body,
            channelId,
            data
        )
    }
}