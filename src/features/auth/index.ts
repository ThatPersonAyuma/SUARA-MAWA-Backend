import { eq } from 'drizzle-orm';
import { db } from '../../db/db_index';
import { adminDetails, firebaseTokens, mahasiswaDetails, penindakDetails, userRoles, users } from '../../db/schema';
import Elysia, { redirect, status, t } from 'elysia';
import { auth, checkAdminDetail, checkMahasiswaDetail, checkPenindakDetail } from './auth';
import { APIError } from 'better-auth';
import { boss } from '../PG-BOSS';
import { getAllUser } from './utils';
import { createAdmin, updateProfile } from './profile';

enum Stage {
    Login = "Login",
    emailVerification = "Email Verification",
    Password = "Password",
    phoneNumberVerification = "Phone Number Verification"
}

interface CheckLogin {
    status: "Success" | "Failed",
    onStage: Stage,
    message: String
}

function isValidIndonesianPhoneNumber(phone: string): boolean {
    // 1. Remove all spaces, dashes, and parentheses to sanitize input
    const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // 2. Indonesian Phone Number Regex
    // - ^(\+62|62|0) : Starts with +62, 62, or 0
    // - 8           : Followed by 8 (standard for Indonesian mobile)
    // - [1-9]       : Valid operator prefix (e.g., 81, 82, 85, etc.)
    // - [0-9]{7,11} : Followed by 7 to 11 digits (total length of 10-14 digits)
    const idPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;

    return idPhoneRegex.test(sanitizedPhone);
}


export function auth_setup(app: Elysia) {
    const betterAuth = new Elysia({
        name: 'better-auth',
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
                    if (!session) throw status(401, {
                        code: "UNAUTHORIZED",
                        message: "Invalid session",
                    });
                    const user = await db.query.users.findFirst({
                        where: eq(users.email, session.user.email), // Filter user condition
                        with: {
                            userRole: {
                                where: eq(userRoles.id, session.user.userRoleId), // Filter nested posts condition
                                columns: { name: true }, // Select specific fields in the relation
                            },
                        },
                        columns: {
                            id: true, // Select specific user fields
                            name: true,
                            email: true,
                            photoProfileId: true,
                            emailVerified: true,
                            phoneNumber: true,
                            phoneNumberVerified: true,
                        },
                    });
                    if (!user?.emailVerified) {
                        throw status(401, {
                            code: "EMAIL_NOT_VERIFIED",
                            message: "Silakan verifikasi email terlebih dahulu",
                        });
                    }
                    switch (user?.userRole.name) {
                        case "MAHASISWA":
                            const res = await checkMahasiswaDetail(user.id);
                            if (!res) {
                                throw status(401, {
                                    code: "EMPTY_MAHASISWA_DETAIL",
                                    message: "Silakan isi detail mahasiswa",
                                });
                            }
                            break;
                        case "PENINDAK":
                            const penindak_res = await checkPenindakDetail(user.id)
                            if (!penindak_res) {
                                throw status(401, {
                                    code: "EMPTY_PENINDAK_DETAIL",
                                    message: "Silakan isi detail penindak",
                                });
                            }
                            break;
                        case "ADMIN":
                            const admin_res = await checkAdminDetail(user.id)
                            if (!admin_res) {
                                throw status(401, {
                                    code: "EMPTY_ADMIN_DETAIL",
                                    message: "Silakan isi detail admin",
                                });
                            }
                            break;
                        default:
                            throw status(401, {
                                code: "INVALID_USER_ROLE",
                                message: "This email domain is not permitted for registration.",
                            });
                    }
                    if (user.phoneNumber == null) {
                        throw status(401, {
                            code: "EMPTY_PHONE_NUMBER",
                            message: "Silakan verifikasi nomor telepon anda",
                        });
                    }
                    if (!user.phoneNumberVerified) {
                        throw status(401, {
                            code: "UNVERIFIED_PHONE_NUMBER",
                            message: "Silakan verifikasi nomor telepon anda",
                        });
                    }
                    
                    return {
                        user: user,
                        session: session.session
                    }
                }
            },
            onboardAuth: {
                async resolve({ status, request: { headers } }) {
                    const session = await auth.api.getSession({
                        headers
                    })
                    if (!session) throw status(401, {
                        code: "UNAUTHORIZED",
                        message: "User Not Found",
                    });
                    const user = await db.query.users.findFirst({
                        where: eq(users.email, session.user.email), // Filter user condition
                        with: {
                            userRole: {
                                where: eq(userRoles.id, session.user.userRoleId), // Filter nested posts condition
                                columns: { name: true }, // Select specific fields in the relation
                            },
                        },
                        columns: {
                            id: true, // Select specific user fields
                            name: true,
                            email: true,
                            photoProfileId: true,
                            emailVerified: true,
                            phoneNumber: true,
                            phoneNumberVerified: true,
                        },
                    });
                    return {
                        user: user,
                        session: session.session
                    }
                }
            },
            adminAuth: {
                async resolve({ status, request: { headers } }) {
                    const session = await auth.api.getSession({
                        headers
                    })
                    if (!session) throw status(401, {
                        code: "UNAUTHORIZED",
                        message: "User Not Found",
                    });
                    const user = await db.query.users.findFirst({
                        where: eq(users.email, session.user.email), // Filter user condition
                        with: {
                            userRole: {
                                where: eq(userRoles.id, session.user.userRoleId), // Filter nested posts condition
                                columns: { name: true }, // Select specific fields in the relation
                            },
                        },
                        columns: {
                            id: true, // Select specific user fields
                            name: true,
                            email: true,
                            photoProfileId: true,
                            emailVerified: true,
                            phoneNumber: true,
                            phoneNumberVerified: true,
                        },
                    });
                    if (user?.userRole.name != "ADMIN"){
                        throw status(401, {
                            code: "UNAUTHORIZED ADMIN",
                            message: "User is Not an Admin",
                        });
                    }
                    return {
                        user: user,
                        session: session.session
                    }
                }
            },
        });
    app.use(betterAuth)
        .get("/api/auth/sign-up/google", async ({ redirect, query: { callback } }) => {
            // 1. Ambil callback dinamis dari query parameter (jika ada)
            // Jika dari Android, nanti URL-nya akan menjadi: /login/oauth?callback=myapp://oauth-callback
            const targetCallback = callback || 'suaramawa://sign-in/google/success';//"https://manifesto-sincere-domelike.ngrok-free.dev/sign-in/google/success";

            try {
                // 2. Panggil API Better Auth dengan callbackURL yang sudah dinamis
                const res = await auth.api.signInSocial({
                    body: {
                        provider: "google",
                        callbackURL: targetCallback,
                        errorCallbackURL: "http://localhost:3000/error"
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
        }, {
            query: t.Object({
                callback: t.Optional(t.String())
            })
        })
        .group('/user', (app) => app
            .post('/logout', async ({set, user, body: {FCMToken}})=>{
                try{
                    await auth.api.signOut({
                        headers: set.headers
                    });
                    await db.delete(firebaseTokens)
                        .where(eq(firebaseTokens.token, FCMToken));
                    return status(200);
                }catch(e){
                    return status(500, e);
                }
            },{
                body: t.Object({
                    FCMToken: t.String()
                }),
                onboardAuth: true
            })
            .get("/get-data", async ({ request, user }) => {
                return user;
            }, {
                onboardAuth: true
            })
            .get("/me", async ({ user }) => {
                const userDetails = await db.query.users.findFirst({
                    where: eq(users.id, user.id),
                    with: {
                        userRole: true,
                        photoProfile: true,
                        mahasiswaDetails: true,
                        adminDetails: true,
                        penindakDetails: {
                            with: {
                                department: true
                            }
                        }
                    }
                });

                if (!userDetails) {
                    return status(404, { message: "User not found" });
                }

                const { mahasiswaDetails, adminDetails, penindakDetails, ...rest } = userDetails;
                let roleDetails = null;

                if (userDetails.userRole.name === 'MAHASISWA') {
                    roleDetails = mahasiswaDetails;
                } else if (userDetails.userRole.name === 'ADMIN') {
                    roleDetails = adminDetails;
                } else if (userDetails.userRole.name === 'PENINDAK') {
                    roleDetails = penindakDetails;
                }

                return {
                    ...rest,
                    roleDetails
                };
            }, {
                auth: true
            })
            .get("/check", async ({ request, user }) => {
                let temp;
                switch(user!.userRole.name){
                    case "MAHASISWA":
                        temp = {
                            'mahasiswaDetail':{
                                'nim': (await db.query.mahasiswaDetails.findFirst({
                                    where: eq(mahasiswaDetails.userId, user.id)
                                }))?.nim
                            }
                        };
                        break;
                    case "PENINDAK":
                        const data = (await db.query.penindakDetails.findFirst({
                                    where: eq(penindakDetails.userId, user.id),
                                    with: {
                                        department: {
                                            columns: {
                                                name: true
                                            }
                                        }
                                    },
                                    columns: {
                                        nik: true
                                    }
                                }))
                        temp = {
                            'penindakDetail':{
                                'nik': data?.nik,
                                'department': data?.department.name
                            }
                        };
                        break;
                    case "ADMIN":
                        temp = {
                            'adminDetail':{
                                'nik': (await db.query.adminDetails.findFirst({
                                    where: eq(adminDetails.userId, user.id),
                                    columns: {
                                        nik: true
                                    }
                                }))?.nik
                            }
                        };
                        break;
                    default:
                        break 
                }
                return {
                    ...user,
                    ...temp
                };
            }, {
                auth: true
            })
            .post('/create/admin', async ({body:{
                name, email, phoneNumber, password, nik, departmentId
            }, user})=>{
                await createAdmin(
                    name,
                    email,
                    phoneNumber,
                    password,
                    nik,
                    departmentId,
                    user.name
                );
            }, {
                body:t.Object({
                    name: t.String(),
                    email: t.String(),
                    phoneNumber: t.String(),
                    password: t.String(),
                    nik: t.String(),
                    departmentId: t.Number()
                }),
                adminAuth: true
            })
            .post('/penindak/created', async({body:{name, email, password, phoneNumber, nik, departmentId}, user})=>{
                // Implement admin creation here
                const roles = await db.query.userRoles.findMany();
                const penindakRole = roles.find(r => r.name === "PENINDAK")!;
                await auth.api.signUpEmail({
                    body:{
                        name: name,
                        email: email,
                        password: password,
                        phoneNumber: phoneNumber,
                        userRoleId: penindakRole.id,
                    }
                });
                const retrieved_user = await db.query.users.findFirst({
                    where: eq(users.email, email),
                    columns:{
                        id: true
                    }
                })
                if (retrieved_user == null){
                    return status(500, {
                        'status':'failed',
                        'message':'Gagal menambahkan akun penindak'
                    });
                }
                await db.insert(penindakDetails)
                    .values({
                        userId: retrieved_user.id,
                        nik: nik,
                        departmentId: departmentId
                    });
                await boss.send(
                    'notify-to-admin',
                    {
                        penindakName: name,
                        adminName: user.name,
                        adminId: user.id
                    }
                );
                return status(200, {
                    'status':'success',
                    'message':'Berhasil menambahkan akun penindak'
                })
            },{
                body: t.Object({
                    name: t.String(),
                    email: t.String(),
                    password: t.String(),
                    phoneNumber: t.String(),
                    nik: t.String(),
                    departmentId: t.Number()
                }),
                adminAuth: true
            })
            .get("/mahasiswa-detail", async ({ user }) => {
                try {
                    const result = await db.query.mahasiswaDetails.findFirst({
                        where: eq(mahasiswaDetails.userId, user.id)
                    });
                    return status(200, {
                        "status": result != null ? "success" : "failed",
                        "data": result
                    });
                } catch (e) {
                    throw status(500, {
                        'message': e
                    });
                }
            }, {
                onboardAuth: true
            })
            .get("/penindak-detail", async ({ user }) => {
                try {
                    const result = await db.query.penindakDetails.findFirst({
                        columns: {
                            nik: true
                        },
                        where: eq(penindakDetails.userId, user.id)
                    });
                    return status(200, {
                        "status": result != null ? "success" : "failed",
                        "data": result
                    });
                } catch (e) {
                    throw status(500, {
                        'message': e
                    });
                }
            }, {
                onboardAuth: true
            })
            .post("/mahasiswa-detail", async ({ body: { nim }, user }) => {
                try {
                    await db.insert(mahasiswaDetails)
                        .values({ userId: user.id, nim: nim })
                        .onConflictDoUpdate({
                            target: mahasiswaDetails.userId,
                            set: { nim: nim }
                        })
                    return status(200, {
                        'message': 'Success'
                    });
                } catch (e) {
                    throw status(500, {
                        'message': e
                    });
                }
            }, {
                body: t.Object({
                    nim: t.String()
                }),
                onboardAuth: true
            })
            .post("/phone-number", async ({ body: { phoneNumber }, user }) => {
                try {
                    const isValid = isValidIndonesianPhoneNumber(phoneNumber);
                    if (!isValid) {
                        return status(400, {
                            'message': 'Nomor telepon tidak valid.'
                        })
                    }
                    await db.update(users)
                        .set({
                            phoneNumber: phoneNumber
                        })
                        .where(eq(users.id, user.id));
                    return status(200, {
                        'message': 'success'
                    });
                } catch (e) {
                    throw status(500, {
                        'message': e
                    });
                }
            }, {
                body: t.Object({
                    phoneNumber: t.String()
                }),
                onboardAuth: true
            })
            .get("/phone-number/send-otp", async ({ user }) => {
                try {
                    if (user?.phoneNumber == null) {
                        return status(400);
                    }
                    const data = await auth.api.sendPhoneNumberOTP({
                        body: {
                            phoneNumber: user.phoneNumber,
                        },
                    });
                    console.log(data);
                    return status(200, data);
                } catch (e) {
                    throw status(500, {
                        'message': e
                    });
                }
            }, {
                onboardAuth: true
            })
            .post("/request-password-reset", async ({body: {email}})=>{
                const data = await auth.api.requestPasswordReset({
                    body: {
                        email: email, // required
                        redirectTo: `${process.env.BETTER_AUTH_URL}/reset-password`,
                    },
                });
                console.log(data);
                return data;
            },{
                body: t.Object({
                    email: t.String({
                        pattern: '\.@mail.unej.ac.id' 
                    })
                })
            })
            .post('/update', async ({ body:{nim, nik, phoneNumber, file, name}, user })=>{
                try{
                    await updateProfile(
                        user.id,
                        user.photoProfileId,
                        phoneNumber,
                        // @ts-ignore
                        user.userRole.name,
                        name,
                        nim,
                        nik,
                        file
                    );
                    return status(200, {
                        'status':"success",
                        "message":"Success update user profile"
                    })
                }catch(e){
                    console.log(e);
                    return status(500, {
                        'status':"failed",
                        "message":"Error on update profile"
                    })
                }
            },{
                body: t.Object({
                    nim: t.Nullable(t.String()),
                    nik: t.Nullable(t.String()),
                    phoneNumber: t.Nullable(t.String()),
                    file: t.Optional(t.Nullable(t.File())),
                    name: t.Nullable(t.String())
                }),
                auth: true
            })
            .get('/get-all', async ({ query:{page, userRoleId, keyword}, user})=>{
                try{
                    return await getAllUser(
                        userRoleId,
                        keyword,
                        page
                    );
                }catch(e){
                    console.log(e);
                }
            },{
                query: t.Object({
                    page: t.Optional(t.Number()),
                    userRoleId: t.Optional(t.Number()),
                    keyword: t.Optional(t.String())
                }),
                // adminAuth: true
            })
        )
        // .get("/check/phone/is_verified", async ({ request, user })=>{
        //     return {
        //         'is_verified':user.phoneNumberVerified!=null
        //     }
        // },{
        //     auth: true
        // })
        // .get("/check/phone/get-number", async ({ request, user })=>{
        //     return {
        //         'phoneNumber':user.phoneNumber
        //     }
        // },{
        //     auth: true
        // })

        .get("/error", ({ query: { error } }) => {
            return {
                error: error
            }
        },
            {
                query: t.Object({
                    error: t.String()
                })
            });
}