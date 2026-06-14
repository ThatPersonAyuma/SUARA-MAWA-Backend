import Elysia, { status, t } from "elysia";
import { messaging } from "./firebase";
import { db } from "../../db/db_index";
import { firebaseTokens } from "../../db/schema";
import { eq } from "drizzle-orm";

export function firebaseSetup(app: Elysia){
    app.group('/notification', 
        {
            auth: true
        },
        (myApp)=>
        myApp
            .post('/register', async ({body : {token}, user})=>{
                const ft = await db.query.firebaseTokens.findFirst({
                    where: eq(firebaseTokens.token, token),
                    columns: {
                        id: true
                    }
                });
                try{
                    if (ft == null){
                        await db.insert(firebaseTokens)
                            .values({
                                userId: user.id,
                                token: token
                            });
                    }else{
                        await db.update(firebaseTokens)
                            .set({
                                userId: user.id,
                            }).where(eq(firebaseTokens.token, token));
                    }
                    return status(200, {
                        'status': 'success',
                        'message':'Berhasil menyimpan token'
                    })
                }catch(e){
                    return status(500, {
                        'status': 'failed',
                        'message':'Gagal menyimpan token'
                    })
                }
            },{
                body: t.Object({
                    token: t.String()
                })
            })
            .post('/push', async ({user})=>{
                const registrationToken = await db.query.firebaseTokens.findMany({
                    where: eq(firebaseTokens.userId, user.id),
                    columns: {
                        token: true
                    }
                })
                if(registrationToken.length==0)return status(500);
                for (let i = 0; i < registrationToken.length; i++) {
                    const message = {
                        notification: {
                            title: `Halo ${user.name} dari Server!`,
                            body: 'Ini adalah notifikasi uji coba menggunakan HTTP v1 API.',
                        },
                        android: {
                            "notification": {
                                "channel_id": "report_channel_v4"
                            }
                        },
                        // Data tambahan (opsional) untuk diproses di dalam aplikasi
                        data: {
                            click_action: 'FLUTTER_NOTIFICATION_CLICK',
                            id: '1',
                            status: 'done'
                        },
                        token: registrationToken[i]!.token
                    };
                    messaging.send(message).then((response: any) => {
                        console.log('Notifikasi sukses dikirim:', response);
                        
                    })
                    .catch((error: any) => {
                        console.log('Gagal mengirim notifikasi:', error);
                    });
                }
                return status(200);
            })
        );
}