import { eq } from "drizzle-orm";
import { db } from "../../db/db_index";
import { adminDetails, mahasiswaDetails, penindakDetails, users } from "../../db/schema";
import { auth } from "./auth";
import { status } from "elysia";
import { boss } from "../PG-BOSS";
import { storePhotoProfile } from "../filesystem/fs";

export async function updateProfile(
    userId: string,
    photoProfileId:number|null,
    phoneNumber: string | null,
    userRole: "PENINDAK" | "MAHASISWA" | "ADMIN",
    name: string | null,
    nim: string | null,
    nik: string | null,
    photoFile: File | null,
){
    console.log(`userId: ${userId}
        profile: ${photoProfileId},
        nomorHP: ${phoneNumber},
        role: ${userRole},
        nama: ${name},
        nim: ${nim},
        nik: ${nik},
        profile: ${photoFile}`);
    // return;
    const data : Record<string, any> = {};
    if (phoneNumber!=null && phoneNumber!=""){
        data.phoneNumber = phoneNumber;
        data.phoneNumberVerified = false;
    }
    if (name!=null && name!=""){
        data.name = name;
    }
    if (photoFile!=null){
        console.log(`
            ${photoFile},
            ${userId},
            ${photoProfileId}
            `);
        await storePhotoProfile(
            photoFile,
            userId,
            photoProfileId
        );
    }
    switch(userRole){
        case "PENINDAK":
            if (nik!=null && nik!=""){
                await db.update(penindakDetails)
                    .set({
                        nik: nik
                    })
            }
            break;
        case "ADMIN":
            if (nik!=null && nik!=""){
                await db.update(adminDetails)
                    .set({
                        nik: nik
                    })
            }
            break
        case "MAHASISWA":
            if (nim!=null && nim!=""){
                await db.update(mahasiswaDetails)
                    .set({
                        nim: nim
                    })
            }
            break;
    }
    if(Object.keys(data).length!=0){
        console.log("setted");
        await db.update(users)
            .set(data)
            .where(eq(users.id, userId));
    }
}


export async function createAdmin(
    name: string,
    email: string,
    phoneNumber: string,
    password: string,
    nik: string,
    departmentId: number,
    adminName: string
){
    try{
        const roles = await db.query.userRoles.findMany();
        const penindakRole = roles.find(r => r.name === "PENINDAK")!;
        await auth.api.signUpEmail({
            body:{
                name: name,
                email: email,
                phoneNumber: phoneNumber,
                password: password,
                userRoleId: penindakRole.id,
            }
        });
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
            columns: {
                id: true
            }
        });
        if (user==null)return status(400);
        db.insert(penindakDetails).values({
            userId: user.id,
            nik: nik,
            departmentId: departmentId
        });
        await boss.send('notif-to-admin',
            {
                penindakName: name,
                adminName: adminName,
                adminId: user.id
            }
        )
        return status(200);
    }catch(e){
        return status(500, e);
    }
}