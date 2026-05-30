// auth.ts
import { betterAuth } from "better-auth";
import { z } from "zod";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../db/db_index";
import { bearer, jwt, phoneNumber } from "better-auth/plugins";
import * as schema from "../../db/schema";
import { insertUserSchema } from "../../db/validation";
import { and, eq, ne } from "drizzle-orm";
import { Resend } from "resend";
import 'dotenv/config';
import { account, userRoles, users } from "../../db/schema";
import { env } from "bun";
import { sendWhatsAppOTP } from "./whatsapp/sender";

const signUpPayloadSchema = z.object({
    // Perhatikan: Key di sini harus sesuai dengan JSON yang dikirim Frontend
    name: z.string().min(3, "Nama lengkap terlalu pendek"),
    password: z.string({ error: "Password wajib diisi" })
        .min(8, "Password minimal harus 8 karakter")
        .regex(/[A-Z]/, "Password harus mengandung minimal satu huruf besar")
        .regex(/[0-9]/, "Password harus mengandung minimal satu angka"),
    // Regex email UNEJ bisa dipindah ke sini, selamat tinggal Hooks! 👋
    email: z.email({ error: "Email tidak boleh kosong" })
        .regex(/^[0-9]+@mail\.unej\.ac\.id$/, "Hanya email mahasiswa (NIM@mail.unej.ac.id) yang diizinkan!"),
});

const EMAIL_VERIFICATION_EXPIRES_IN = 900;

export async function checkMahasiswaDetail(userId: String){
    const detail = await db.query.mahasiswaDetails.findFirst({
        where: eq(schema.mahasiswaDetails.userId, userId)
    });
    if (detail==null){
        return false
    }else{
        return true
    }
}
export async function checkPenindakDetail(userId: String){
    const detail = await db.query.penindakDetails.findFirst({
        where: eq(schema.mahasiswaDetails.userId, userId)
    });
    if (detail==null){
        return false
    }else{
        return true
    }
}

const resend = new Resend(process.env.RESEND_SECRET_KEY!);

export const auth = betterAuth({
    plugins: [
        bearer(),
        jwt(),
        phoneNumber({
            expiresIn: 300,
            sendOTP: async ({ phoneNumber, code }, ctx) => {
                // Example integration with WhatsApp API
                console.log(code);
                // await sendWhatsAppOTP( phoneNumber, code, );
                // console.log(`https://wa.me/+6285706525584?text=Halo,%20saya%20ingin%20melakukan%20verifikasi%20nomor%20telepon.%20Kode%20OTP:%20${code}%20*Mohon%20jangan%20membagikan%20kode%20ini%20kepada%20siapa%20pun.*`)
            },
            // opt
        }),
        // {
        //     id: "google-email-checker",
        //     hooks: {
        //         after: [
        //         {
        //             // Mencegat endpoint callback OAuth Google
        //             matcher: (context) => context.path.startsWith("/callback"),
        //             handler: async (context) => {
        //             // 📍 1. Ambil data response hasil jabat tangan dengan Google
        //             const responseData = context.response;
        //             console.log("Run Handler")
        //             // 📍 2. Cek apakah di dalam response terdapat objek 'user'
        //             if (responseData && "user" in responseData) {
                        
        //                 // 🔥 DI SINI EMAILNYA BISA DIAKSES!
        //                 const email = responseData.user.email;
        //                 console.log("Email dari Google OAuth:", email);

        //                 // 3. Lakukan pengecekan Anda
        //                 const domainDiizinkan = "@perusahaan.com";
                        
        //                 if (!email.endsWith(domainDiizinkan)) {
        //                 console.log(`Akses ditolak untuk email: ${email}`);

        //                 // 📍 4. Gunakan APIError, jangan throw Error biasa.
        //                 // Ini akan membatalkan pembuatan session secara bersih.
        //                 throw new APIError("UNAUTHORIZED", {
        //                     message: "Email Anda tidak terdaftar dalam sistem internal.",
        //                 });
        //                 }
        //             }
        //             },
        //         },
        //         ],
        //     },
        // }
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
            userRoleId: {
                type: "number",
                required: true,
                input: true,
            },
        },
        softDelete: true,
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (!user.email.endsWith("unej.ac.id")) {
                        // Jika TIDAK SESUAI, lempar APIError.
                        // Ini akan otomatis membatalkan penulisan ke database.
                        console.log("Bukan email unej");
                        throw new APIError("BAD_REQUEST", {
                            message: "Pendaftaran gagal. Anda harus menggunakan email resmi @unej.ac.id!",
                        });
                    }
                    if (user.userRoleId != null){
                        return {
                            data: user
                        };
                    }
                    if (user.emailVerified){
                        user.emailVerifiedAt = new Date();
                    }
                    const roleResult = await db
                        .select({ id: userRoles.id })
                        .from(userRoles)
                        .where(eq(userRoles.name, "MAHASISWA"))
                        .limit(1);
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
        // session: {
        //     create:{
        //         before: async (userContext)=>{
        //             // 2. Cari data user tersebut di database via Drizzle
        //             console.log(userContext);
        //             const user = await db.query.users.findFirst({
        //                 where: eq(users.id, userContext.userId),
        //                 with: {
        //                     userRole: {
        //                         columns: {
        //                             name: true
        //                         }
        //                     },
        //                 }
        //             })
        //             console.log(user);
                    
        //             return true;
        //         }
        //     },
        // }
    },
    emailAndPassword: {
        autoSignIn: true,
        enabled: true,
        requireEmailVerification: true, // Wajib verifikasi email
    },
    socialProviders: {
        google: { // Contoh OAuth2 Google
            clientId: [
                process.env.GOOGLE_CLIENT_WEB_ID!,
                process.env.GOOGLE_CLIENT_ANDROID_ID!,
            ],
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
    // async signInSocial() {
    //     console.log('signing in with google')
    //     await auth.api.signInSocial({
    //         body: {
    //             provider: "google", // or any other provider id
    //         },
    //     });
    // },
    
    emailVerification: {
        sendOnSignUp: true,
        expiresIn: EMAIL_VERIFICATION_EXPIRES_IN,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }) => {
            // Logika pengiriman email (Gunakan Resend, Nodemailer, dll)
            // console.log(`Kirim email verifikasi ke ${user.email} dengan link: ${url} dengan token ${token}`);
            // const { data, error } = await resend.emails.send({
            //             from: 'noreply@update.ariear.my.id',
            //             to: user.email, 
            //             subject: 'Uji Coba Resend Development',
            //             html: createHtmlEmailVerif(url, user.name)
            //         });
            // if (error) {
            //     return console.error('Gagal mengirim:', error);
            // }
            const expiresAt = new Date(
                Date.now() + EMAIL_VERIFICATION_EXPIRES_IN * 1000
            );
            console.log(createHtmlEmailVerif(url, user.name, expiresAt));
            console.log('Url: ', url);
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
            console.log(ctx.path);
            if (
                ctx.path === "/sign-up/email" &&
                ctx.request?.method === "POST"
            ) {
                const parsed = signUpPayloadSchema.safeParse(ctx.body);
                if (!parsed.success) {
                    const errorMessage =
                        z.prettifyError(parsed.error);
                    // console.log(`Error: ${z.treeifyError(parsed.error).properties?.email[0]}`);
                    throw new APIError("BAD_REQUEST", {
                        message: JSON.stringify(errorMessage),
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
                        code: "INTERNAL_SERVER_ERROR",
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


function createHtmlEmailVerif(verification_url: string, name: string, expiredIn: Date){
    return `<!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Verifikasi Email</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
        <tr>
        <td align="center">
            <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
                max-width:600px;
                background:#ffffff;
                border-radius:16px;
                overflow:hidden;
                box-shadow:0 4px 20px rgba(0,0,0,0.06);
            "
            >
            
            <!-- Header -->
            <tr>
                <td
                align="center"
                style="
                    background:linear-gradient(135deg,#2563eb,#1d4ed8);
                    padding:40px 24px 32px;
                "
                >
                <img
                    src="${env.BETTER_AUTH_URL}/logo"
                    alt="Logo" width="100" style=" display:block; margin-bottom:20px; border-radius:16px; background:white; padding:8px; object-fit:contain; height:auto; max-width:100%; "
                />

                <h1
                    style="
                    margin:0;
                    font-size:28px;
                    color:#ffffff;
                    font-weight:700;
                    "
                >
                    Verifikasi Email
                </h1>

                <p
                    style="
                    margin:12px 0 0;
                    color:rgba(255,255,255,0.9);
                    font-size:15px;
                    line-height:24px;
                    "
                >
                    Satu langkah lagi untuk mengaktifkan akun Anda
                </p>
                </td>
            </tr>

            <!-- Content -->
            <tr>
                <td style="padding:40px 32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:28px;">
                    Halo <strong>${name}</strong>,
                </p>

                <p style="margin:0 0 24px;font-size:16px;line-height:28px;color:#4b5563;">
                    Terima kasih telah mendaftar. Untuk melanjutkan proses aktivasi akun,
                    silakan verifikasi alamat email Anda dengan menekan tombol di bawah ini.
                </p>

                <!-- Button -->
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                    <td align="center" style="padding:8px 0 32px;">
                        <a
                        href="${verification_url}"
                        style="
                            display:inline-block;
                            background:#2563eb;
                            color:#ffffff;
                            text-decoration:none;
                            padding:16px 32px;
                            border-radius:12px;
                            font-size:16px;
                            font-weight:600;
                        "
                        >
                        Verifikasi Email
                        </a>
                    </td>
                    </tr>
                </table>

                <p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#6b7280;">
                    Jika tombol tidak dapat ditekan, salin dan buka link berikut:
                </p>

                <p
                    style="
                    margin:0 0 32px;
                    word-break:break-all;
                    font-size:14px;
                    line-height:24px;
                    "
                >
                    <a
                    href="${verification_url}"
                    style="color:#2563eb;text-decoration:none;"
                    >
                    ${verification_url}
                    </a>
                </p>

                <div
                    style="
                    border-top:1px solid #e5e7eb;
                    padding-top:24px;
                    "
                >
                    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:24px;">
                    Jika Anda tidak merasa membuat akun, Anda dapat mengabaikan email ini.
                    </p>

                    <p style="margin:0;font-size:14px;color:#6b7280;line-height:24px;">
                    Link verifikasi akan kedaluwarsa dalam <strong>${expiredIn}</strong>.
                    </p>
                </div>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td
                align="center"
                style="
                    background:#f9fafb;
                    padding:24px;
                    border-top:1px solid #e5e7eb;
                "
                >
                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:22px;">
                    © 2026 Suara Mawa. All rights reserved.
                </p>
                </td>
            </tr>

            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>`;
} 