import { eq } from 'drizzle-orm';
import { db } from '../../db/db_index';
import { userRoles, users } from '../../db/schema';
import Elysia, { status, t } from 'elysia';
import { auth } from './auth';

function on_boarding_page(){
    const onBoarding = new Elysia();
}

export function auth_setup(app: Elysia){
    const betterAuth = new Elysia({name: 'better-auth',
        cookie: {
        // WAJIB: Samakan dengan BETTER_AUTH_SECRET di .env kamu
            secrets: process.env.BETTER_AUTH_SECRET 
        }
    })
        .mount(auth.handler)
        .macro({
            auth: {
                async resolve({ status, request: { headers } }) {
                    const session = await auth.api.getSession({
                        headers
                    })
                    if (!session) return status(401);
                    const user = await db.query.users.findFirst({
                                where: eq(users.email, session.user.email), // Filter user condition
                                with: {
                                    userRole: {
                                        where: eq(userRoles.id, session.user.userRoleId), // Filter nested posts condition
                                        columns: { name: true }, // Select specific fields in the relation
                                    },
                                //     photoProfile: {
                                //         where: eq(files.id, session.user.image!), // Filter nested posts condition
                                //         columns: { name: true, filetype: true },
                                //     }
                                },
                                columns: {
                                    id: true, // Select specific user fields
                                    name: true,
                                    email: true,
                                    photoProfileId: true,
                                    // userRoleId: true,
                                },
                                });
                    return {
                        user: user,
                        session: session.session
                    }
                }
            }
        });
    app.use(betterAuth)
        .get("/api/auth/sign-up/google", async ({ redirect, query: {callback} }) => {
            // 1. Ambil callback dinamis dari query parameter (jika ada)
            // Jika dari Android, nanti URL-nya akan menjadi: /login/oauth?callback=myapp://oauth-callback
            const targetCallback = callback || "http://localhost:3000/setup/password";

            try {
                // 2. Panggil API Better Auth dengan callbackURL yang sudah dinamis
                const res = await auth.api.signInSocial({
                    body: {
                        provider: "google",
                        callbackURL: targetCallback, 
                    },
                });

                // 3. Jika Better Auth berhasil membuat URL redirect Google
                if (res && res.url) {
                    return res;
                }

                return {
                    success: false,
                    message: "Gagal menginisialisasi OAuth Google"
                };
                
            } catch (error) {
                return {
                    success: false,
                    message: "Terjadi kesalahan pada server",
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        },{
            query: t.Object({
                callback: t.Optional(t.String())
            })
        })
        ;
}