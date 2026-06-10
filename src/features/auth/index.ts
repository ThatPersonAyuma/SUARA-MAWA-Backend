import { eq } from 'drizzle-orm';
import { db } from '../../db/db_index';
import { adminDetails, mahasiswaDetails, penindakDetails, userRoles, users } from '../../db/schema';
import Elysia, { redirect, status, t } from 'elysia';
import { auth, checkMahasiswaDetail, checkPenindakDetail } from './auth';
import { APIError } from 'better-auth';

function on_boarding_page() {
    const onBoarding = new Elysia();
}

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
                    console.log("Headers: ", headers);
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
            }
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
                            'mahasiswaDetail':{
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