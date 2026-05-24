import { eq } from 'drizzle-orm';
import { db } from '../../db/db_index';
import { userRoles, users } from '../../db/schema';
// import { insertUserSchema, updateUserSchema } from '../../db/validation';
import { OptResult } from '../shared';
import Elysia, { status, t } from 'elysia';
import { auth } from './auth';

// async function insertMahasiswa(req_body: unknown): Promise<OptResult> {
//     try {
//         // 1. Ambil ID Role "MAHASISWA" secara spesifik
//         const roleResult = await db
//             .select({ id: userRoles.id })
//             .from(userRoles)
//             .where(eq(userRoles.name, "MAHASISWA"))
//             .limit(1);

//         const mahasiswaRole = roleResult[0];

//         if (!mahasiswaRole) {
//             return { status: "fail", message: "Role MAHASISWA tidak ditemukan di database" };
//         }

//         // 2. Validasi input menggunakan Zod
//         // Pastikan insertUserSchema sudah sesuai dengan req_body
//         const validatedData = await insertUserSchema.parseAsync(req_body);

//         // 3. Mapping data untuk insert
//         const usersData: UsersInsert = {
//             fullName: validatedData.fullName,
//             email: validatedData.email,
//             phoneNumber: validatedData.phoneNumber,
//             password: await Bun.password.hash(validatedData.password),
//             userRoleId: mahasiswaRole.id, // Gunakan ID yang didapat dari query di atas
//             lastLogin: new Date(),
//         };

//         // 4. Eksekusi Insert
//         let res = await db.insert(users).values(usersData).returning({ id: users.id });;

//         // create Mahasiswa Detail

//         return { status: "success", message: "Berhasil menambahkan Mahasiswa" };

//     } catch (error) {
//         // Tips: Jika error berasal dari Zod, Anda bisa memformatnya agar lebih user-friendly
//         return { 
//             status: "fail", 
//             message: error instanceof Error ? error.message : "Terjadi kesalahan internal" 
//         };
//     }
// }
// async function updateUser(req_body: unknown): Promise<OptResult> {
//     const validatedUser = await updateUserSchema.parseAsync(req_body);
//     validatedUser.password = await Bun.password.hash(validatedUser.password);
//     const { id, ...dataToUpdate } = validatedUser;
//     try {
//         await db
//             .update(users)
//             .set(dataToUpdate) // Updated values
//             .where(eq(users.id, id)); // Condition
//         return { status: "success", message: "Berhasil merubah Mahasiswa" };
//     } catch (error) {
//         // Tips: Jika error berasal dari Zod, Anda bisa memformatnya agar lebih user-friendly
//         return { 
//             status: "fail", 
//             message: error instanceof Error ? error.message : "Terjadi kesalahan internal" 
//         };
//     }
// }   

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
        .get('/login/oauth', async ({ redirect, headers }) => {
    // 1. Panggil API Better Auth untuk membuat URL sign-in Google
            const res = await auth.api.signInSocial({
                body: {
                    provider: "google",
                    // Pastikan callbackURL menggunakan URL absolut frontend kamu nanti
                    // Contoh: "http://localhost:3000/dashboard" atau "https://suaramawa.com/dashboard"
                    callbackURL: "http://localhost:3000/setup/password", 
                },
            });

            // 2. Cek apakah Better Auth berhasil membuat URL redirect
            if (res && res.url) {
                // Ambil URL Google tersebut dan redirect user ke sana
                return redirect(res.url);
            }

            // Gagal membuat URL redirect
            return {
                success: false,
                message: "Gagal menginisialisasi OAuth Google"
            };
        })
        // .post('/user/registration', async (context)=> {
        //     let res: OptResult = await insertMahasiswa(context.body);
        //     if (res.status=="success"){
        //         return status(201, {msg: res.message});
        //     }else{
        //         return status(500, {msg: res.message});
        //     }
        // })
        // .put('/user/update', async (context)=>{
        //     let res: OptResult = await updateUser(context.body);
        //     if (res.status=="success"){
        //         return status(200, {msg: res.message});
        //     }else{
        //         return status(500, {msg: res.message});
        //     }
        // })
        // .use(betterAuth);
        ;
}