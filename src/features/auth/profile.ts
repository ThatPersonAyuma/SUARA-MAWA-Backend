import { eq } from "drizzle-orm";
import { db } from "../../db/db_index";
import { penindakDetails, users } from "../../db/schema";

export async function updateProfile(
    userId: string,
    
){
    await db.update(users)
        .set(data)
        .where(eq(users.id, userId));
}


export async function createAdmin(
    name: string,
    email: string,
    phoneNumber: string,
    password: string,
    nik: string,
    departmentId: number
    // nip: string
){
    const roles = await db.query.userRoles.findMany();
    const penindakRole = roles.find(r => r.name === "PENINDAK")!;
    await auth.api.signUpEmail({
        body:{
            name: "Budi Santoso",
            email: "2@mail.unej.ac.id",
            phoneNumber: "082222222222",
            password: 'Mahasiswa123!',
            userRoleId: penindakRole.id,
        }
    });
    const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: {
            id: true
        }
    })
    if (user==null)return status(400);
    db.insert(penindakDetails).values({
        userId: user.id,
        nik: nik,
        departmentId: departmentId
    });
    return status(200);
}