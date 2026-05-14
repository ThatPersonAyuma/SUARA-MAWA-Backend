import { eq } from 'drizzle-orm';
import { db } from '../../db/db_index';
import {userRoles, users, UsersInsert, } from '../../db/schema';
import { insertUserSchema, selectUserSchema, updateUserSchema } from '../../db/validation';
import { OptResult } from '../shared';
import Elysia, { status, t } from 'elysia';

async function insertMahasiswa(req_body: unknown): Promise<OptResult> {
    try {
        // 1. Ambil ID Role "MAHASISWA" secara spesifik
        const roleResult = await db
            .select({ id: userRoles.id })
            .from(userRoles)
            .where(eq(userRoles.name, "MAHASISWA"))
            .limit(1);

        const mahasiswaRole = roleResult[0];

        if (!mahasiswaRole) {
            return { status: "fail", message: "Role MAHASISWA tidak ditemukan di database" };
        }

        // 2. Validasi input menggunakan Zod
        // Pastikan insertUserSchema sudah sesuai dengan req_body
        const validatedData = await insertUserSchema.parseAsync(req_body);

        // 3. Mapping data untuk insert
        const usersData: UsersInsert = {
            fullName: validatedData.fullName,
            email: validatedData.email,
            phoneNumber: validatedData.phoneNumber,
            password: await Bun.password.hash(validatedData.password),
            userRoleId: mahasiswaRole.id, // Gunakan ID yang didapat dari query di atas
            lastLogin: new Date(),
        };

        // 4. Eksekusi Insert
        let res = await db.insert(users).values(usersData).returning({ id: users.id });;

        // create Mahasiswa Detail

        return { status: "success", message: "Berhasil menambahkan Mahasiswa" };

    } catch (error) {
        // Tips: Jika error berasal dari Zod, Anda bisa memformatnya agar lebih user-friendly
        return { 
            status: "fail", 
            message: error instanceof Error ? error.message : "Terjadi kesalahan internal" 
        };
    }
}
async function updateUser(req_body: unknown): Promise<OptResult> {
    const validatedUser = await updateUserSchema.parseAsync(req_body);
    validatedUser.password = await Bun.password.hash(validatedUser.password);
    const { id, ...dataToUpdate } = validatedUser;
    try {
        await db
            .update(users)
            .set(dataToUpdate) // Updated values
            .where(eq(users.id, id)); // Condition
        return { status: "success", message: "Berhasil merubah Mahasiswa" };
    } catch (error) {
        // Tips: Jika error berasal dari Zod, Anda bisa memformatnya agar lebih user-friendly
        return { 
            status: "fail", 
            message: error instanceof Error ? error.message : "Terjadi kesalahan internal" 
        };
    }
}   

export function setup(app: Elysia){
    app.post('/user/registration', async (context)=> {
            let res: OptResult = await insertMahasiswa(context.body);
            if (res.status=="success"){
                return status(201, {msg: res.message});
            }else{
                return status(500, {msg: res.message});
            }
        })
        .put('/user/update', async (context)=>{
            let res: OptResult = await updateUser(context.body);
            if (res.status=="success"){
                return status(200, {msg: res.message});
            }else{
                return status(500, {msg: res.message});
            }
        });
}