// auth.ts
import { betterAuth } from "better-auth";
import { z } from "zod";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../db/db_index";
import { jwt, phoneNumber } from "better-auth/plugins";
import * as schema from "../../db/auth_schema";
import { insertUserSchema } from "../../db/validation";
import { eq } from "drizzle-orm";
import { userRoles } from "../../db/app_schema";
import { Resend } from "resend";
import 'dotenv/config';

const signUpPayloadSchema = z.object({
                // Perhatikan: Key di sini harus sesuai dengan JSON yang dikirim Frontend
                name: z.string().min(3, "Nama lengkap terlalu pendek"),
                
                // Regex email UNEJ bisa dipindah ke sini, selamat tinggal Hooks! 👋
                email: z.email({ error: "Email tidak boleh kosong" })
                    .regex(/^[0-9]+@mail\.unej\.ac\.id$/, "Hanya email mahasiswa (NIM@mail.unej.ac.id) yang diizinkan!"),
                
                phoneNumber: z.string({
                    error: "Nomor telepon wajib diisi",
                }).regex(/^\+[1-9]\d{1,14}$/, "Invalid E.164 phone number, gunakan awalan kode negara (contoh: +628...)"),
            });

const resend = new Resend(process.env.RESEND_SECRET_KEY!);

export const auth = betterAuth({
    plugins: [
        jwt(),
        phoneNumber({
            sendOTP: async ({ phoneNumber, code }, ctx) => {
                // Example integration with WhatsApp API
                console.log(code)
                const response = await fetch("https://your-whatsapp-provider.com", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.WHATSAPP_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: phoneNumber,
                    type: "template",
                    template: {
                    name: "your_otp_template_name", // Must be Meta approved
                    language: { code: "en" },
                    components: [
                        {
                        type: "body",
                        parameters: [
                            { type: "text", text: code }
                        ]
                        }
                    ]
                    }
                }),
                });

                if (!response.ok) {
                throw new Error("Failed to send WhatsApp OTP");
                }
            },
            }),
    ],
    account: {
        skipStateCookieCheck: true,
        accountLinking: {
            trustedProviders: ["google"], // Add your providers here
        }
    },
    oauthConfig: {
        // Hanya bypass state check saat di luar production (development)
        skipStateCookieCheck: process.env.NODE_ENV!='production', 
    },
    cookie: {
        // Wajib TRUE di prod karena HTTPS aman. False saat dev (http://localhost)
        secure: process.env.NODE_ENV=='production', 
        // Lax adalah opsi paling aman untuk flow redirect OAuth agar tidak diblokir browser modern
        sameSite: "lax", 
    },
    secret: process.env.BETTER_AUTH_SECRET,
    // advanced: {
    //     cookiePrefix: "myapp-auth", // Custom prefix for your app's cookies
    //     cookieOptions: {
    //     sameSite: "lax",
    //     secure: process.env.NODE_ENV === "production", // HttpOnly and Secure in prod
    //     },
    //     // revokeSessionsOnPasswordReset: true, // Uncomment to revoke all other sessions on a successful password reset
    // },
    // cookie: {
    //     secure: false, // Wajib false karena localhost menggunakan HTTP biasa
    //     sameSite: "lax", // Mengizinkan cookie dibawa saat redirect dari luar (Google)
    // },
    database: drizzleAdapter(db, {
            provider: "pg", // atau sqlite / mysql
            schema:{
                ...schema,
                user: schema.users
            } 
        }),
    user: {
        modelName: "users",
        fields: {
            image: "photoProfileId",
        },
        additionalFields: {
            phoneNumber: {
                type:"string",
                required: false,
                input:false
            },
            userRoleId: {
                type: "number",
                required: true,
                input: true,
            },
        }
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (!user.email.endsWith("@unej.ac.id")) {
                        // Jika TIDAK SESUAI, lempar APIError.
                        // Ini akan otomatis membatalkan penulisan ke database.
                        throw new APIError("BAD_REQUEST", {
                            message: "Pendaftaran gagal. Anda harus menggunakan email resmi @unej.ac.id!",
                        });
                    }
                    const roleResult = await db
                        .select({ id: userRoles.id })
                        .from(userRoles)
                        .where(eq(userRoles.name, "MAHASISWA"))
                        .limit(1);
                    console.log(roleResult);
                    // 2. Berikan validasi aman (fallback) jika database kosong
                    // Jika ketemu, pakai ID-nya. Jika tidak ketemu, default ke ID 1 (atau ID role mahasiswa kamu)
                    const finalRoleId = (roleResult.length > 0) ? roleResult[0].id : 1;
                    return {
                        data: {
                            ...user,
                            // Paksa nilai image menjadi null atau undefined 
                            // agar database mengosonginya atau menggunakan nilai DEFAULT
                            image: null, 
                            userRoleId: finalRoleId,
                        },
                    };
                },
            },
        },
    },
    emailAndPassword: {
        autoSignIn: false,
        enabled: true,
        requireEmailVerification: true, // Wajib verifikasi email
    },
    socialProviders: {
        google: { // Contoh OAuth2 Google
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
            authorizationQuery: {
                hd: "unej.ac.id", // Forces users to sign in with this specific Google Apps domain
            },
        },
    },
    trustedOrigins: [
        "https://yourdomain.com", 
        "myapp://", // Custom scheme for mobile apps
        "http://localhost:3000"
    ],
    advanced: {
        cookies: {
        state: {
            attributes: {
                sameSite: "none",
                secure: true,
                },
            },
        },
    },
    async signInSocial() {
        console.log('signing in with google')
        await auth.api.signInSocial({
            body: {
                provider: "google", // or any other provider id
            },
        });
    },
    emailVerification: {
        sendOnSignUp: true,
        expiresIn: 300,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }) => {
            // Logika pengiriman email (Gunakan Resend, Nodemailer, dll)
            // console.log(`Kirim email verifikasi ke ${user.email} dengan link: ${url} dengan token ${token}`);
            const { data, error } = await resend.emails.send({
                        from: 'verify@update.ariear.my.id',
                        to: '242410103025@mail.unej.ac.id', // WAJIB: Email akun Anda sendiri
                        subject: 'Uji Coba Resend Development',
                        html: `<p>Halo! Ini adalah email uji coba menggunakan <strong>onboarding@resend.dev</strong>.</p><a href="${url}">Verifikasi Email</a><p>oken anda: ${token}</p>`
                    });
            if (error) {
                return console.error('Gagal mengirim:', error);
            }

            console.log('Berhasil dikirim dengan ID:', data.id);
        },
        async beforeEmailVerification(user, request) {
            await db.update(schema.users)
                .set({
                    emailVerifiedAt: new Date()
                })
                .where(eq(schema.users.id, user.id));
        },
    },
    // Filter domain email NIM.univ.ac.id
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (
                ctx.path === "/sign-up/email" &&
                ctx.request?.method === "POST"
            ) {
                const parsed = signUpPayloadSchema.safeParse(ctx.body);
                if (!parsed.success) {
                    const errorMessage =
                        z.treeifyError(parsed.error).errors[0];
                    console.log(`Error: ${parsed.error}`);
                    throw new APIError("BAD_REQUEST", {
                        message: errorMessage,
                    });
                }
                // Cari role mahasiswa
                const roleResult = await db
                    .select({ id: userRoles.id })
                    .from(userRoles)
                    .where(eq(userRoles.name, "MAHASISWA"))
                    .limit(1);

                if (roleResult.length === 0) {
                    throw new APIError("INTERNAL_SERVER_ERROR", {
                        message: "Role mahasiswa tidak ditemukan",
                    });
                }

                // Tambahkan field ke body Better Auth
                if (roleResult[0]){
                    ctx.body.userRoleId = roleResult[0].id;
                }
            }

            return ctx;
        }),
    },
    basePath: "api/auth",
});
