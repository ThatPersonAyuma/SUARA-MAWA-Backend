import Elysia, { t } from "elysia";
import { db } from "../../db/db_index";
import { departments, mahasiswaDetails, penindakDetails, userRoles, users } from "../../db/schema";
import { PAGE_SIZE } from "../shared";
import { count, eq } from 'drizzle-orm';
import { checkMahasiswaDetail } from "../auth/auth";

export function get_users(currentPage: number){
    const all_users = db.select()
        .from(users)
        .limit(PAGE_SIZE)
        .offset((currentPage-1) * PAGE_SIZE);
    return all_users;
}

export async function getAllMahasiswa(currentPage: number=1){
    const [data, countResult] = await Promise.all([
        db.select({
            id: users.id,
            name: users.name,
            userRole: userRoles.name,
            photoProfileId: users.photoProfileId,
            email: users.email
        })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.id, users.userRoleId))
        .innerJoin(mahasiswaDetails, eq(mahasiswaDetails.userId, users.id))
            // .where(eq(departments.id, departmentId))
            .limit(PAGE_SIZE)
            .offset((currentPage-1) * PAGE_SIZE),
        db.select({ total: count() }).from(users).innerJoin(mahasiswaDetails, eq(mahasiswaDetails.userId, users.id))
    ]);

    const totalRows = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);
    return {
        data,
        meta: {
            totalRows,
            totalPages,
            currentPage: currentPage,
            PAGE_SIZE,
        }
    };
}

export async function getMahasiswaDetail(mahasiswaId: string){
    return await db.query.users.findFirst({
        where: eq(users.id, mahasiswaId),
        with: {
            mahasiswaDetails:{
                columns:{
                    nim: true,
                }
            },
            userRole: true,
            photoProfile:{
                columns:{
                    id: true,
                }
            }
        },
        columns:{
            name: true,
            lastLogin: true,
            createdAt: true,
            email: true,
            phoneNumber: true,
            emailVerified: true,
            emailVerifiedAt: true,
            phoneNumberVerified: true,
        }
    })
}

export async function getAllPenindak(currentPage: number=1){
    const [data, countResult] = await Promise.all([
        db.select({
        id: users.id,
        name: users.name,
        userRole: userRoles.name,
        photoProfileId: users.photoProfileId,
        email: users.email,
        nik: penindakDetails.nik,
        departmentName: departments.name,
    })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.id, users.userRoleId))
    .innerJoin(penindakDetails, eq(penindakDetails.userId, users.id))
    .innerJoin(departments, eq(departments.id, penindakDetails.departmentId))
        // .where(eq(departments.id, departmentId))
        .limit(PAGE_SIZE)
        .offset((currentPage-1) * PAGE_SIZE),
    db.select({ total: count() }).from(users).innerJoin(mahasiswaDetails, eq(mahasiswaDetails.userId, users.id))
    ]);

    const totalRows = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);
    return {
        data,
        meta: {
            totalRows,
            totalPages,
            currentPage: currentPage,
            PAGE_SIZE,
        }
    };
}

export async function getPenindakDetail(penindakId: string){
    return await db.query.users.findFirst({
        where: eq(users.id, penindakId),
        with: {
            penindakDetails: {
                columns:{
                    nik: true,
                },
                with:{
                    department: {
                        columns:{
                            name: true
                        }
                    }
                }
            },
            userRole: true,
            photoProfile:{
                columns:{
                    id: true,
                }
            },
        },
        columns:{
            name: true,
            lastLogin: true,
            createdAt: true,
            email: true,
            phoneNumber: true,
            emailVerified: true,
            emailVerifiedAt: true,
            phoneNumberVerified: true,
        }
    })
}

export function user_setup(){
    const app = new Elysia();
    app.group('/admin', (app)=>app
        .get('/user/all', ({ query: {page} })=>{
            if (page==null||page<=0){
                page=1
            }
            return get_users(page);
        }, {
            query: t.Object({
                page: t.Optional(t.Number())
            })
        })
        .group('/mahasiswa', (app)=>app
            .get('/get-all', ({params:{page}})=>{
                if (page!=undefined)return getAllMahasiswa(page);
                return getAllMahasiswa();
            },{
                params: t.Object({
                    page: t.Optional(t.Number())
                })
            })
            .post('/get-detail', async ({body:{mahasiswaId}})=>{
                return await getMahasiswaDetail(mahasiswaId);
            },{
                body: t.Object({
                    mahasiswaId: t.String(),
                })
            })
        ).group('/admin', (app)=>app
            .get('/get-all', ({params:{page}})=>{
                if (page!=undefined)return getAllPenindak(page);
                return getAllPenindak();
            },{
                params: t.Object({
                    page: t.Optional(t.Number())
                })
            })
            .post('/get-detail', async ({body:{penindakId}})=>{
                return await getPenindakDetail(penindakId);
            },{
                body: t.Object({
                    penindakId: t.String(),
                })
            })
        )
    );
    return app;
}