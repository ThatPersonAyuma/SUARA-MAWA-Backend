// auth.ts
import { betterAuth } from "better-auth";
import { z } from "zod";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../db/db_index";
import { jwt } from "better-auth/plugins";
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
    ],
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
                required: true,
                input:true
            },
            userRoleId: {
                type: "number",
                required: true,
                input: true,
            },
        }
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
        },
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
            // Run pre-verification logic
            console.log(`About to verify ${user.email}`);
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