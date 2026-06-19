import { PAGE_SIZE } from "../shared";
import { db } from "../../db/db_index";
import { adminDetails, departments, mahasiswaDetails, penindakDetails, userRoles, users } from "../../db/schema";
import { and, count, eq, ilike, or } from "drizzle-orm";

export async function getAllUser(
    roleId: number | undefined,
    keyword: string | undefined,
    currentPage: number = 1
) {
    const offset = (currentPage - 1) * PAGE_SIZE;

    const filters = [];

    if (roleId != null) {
        filters.push(eq(users.userRoleId, roleId));
    }

    if (keyword) {
        filters.push(
            or(
                ilike(users.name, `%${keyword}%`),
                ilike(users.email, `%${keyword}%`),
                ilike(mahasiswaDetails.nim, `%${keyword}%`),
                ilike(penindakDetails.nik, `%${keyword}%`),
                ilike(adminDetails.nik, `%${keyword}%`)
            )
        );
    }

    const whereCondition = filters.length
        ? and(...filters)
        : undefined;


    const [data, countResult] = await Promise.all([

        db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            lastLogin: users.lastLogin,
            phoneNumber: users.phoneNumber,
            department:{
                id: departments.id,
                name: departments.name
            },
            userRole:{
                name: userRoles.name
            },

            mahasiswaDetails:{
                nim: mahasiswaDetails.nim
            },

            penindakDetails:{
                nik: penindakDetails.nik
            },

            adminDetails:{
                nik: adminDetails.nik
            }
        })
        .from(users)

        .leftJoin(
            userRoles,
            eq(userRoles.id, users.userRoleId)
        )
    
        .leftJoin(
            mahasiswaDetails,
            eq(users.id, mahasiswaDetails.userId)
        )

        .leftJoin(
            penindakDetails,
            eq(users.id, penindakDetails.userId)
        )
        .leftJoin(
            departments,
            eq(penindakDetails.departmentId, departments.id)
        )
        .leftJoin(
            adminDetails,
            eq(users.id, adminDetails.userId)
        )

        .where(whereCondition)

        .limit(PAGE_SIZE)
        .offset(offset),



        db
        .select({
            total: count()
        })
        .from(users)

        .leftJoin(
            mahasiswaDetails,
            eq(users.id, mahasiswaDetails.userId)
        )

        .leftJoin(
            penindakDetails,
            eq(users.id, penindakDetails.userId)
        )

        .leftJoin(
            adminDetails,
            eq(users.id, adminDetails.userId)
        )

        .where(whereCondition)

    ]);


    const totalRows = countResult[0]?.total ?? 0;


    return {
        data,
        meta:{
            totalRows,
            totalPages: Math.ceil(totalRows / PAGE_SIZE),
            currentPage,
            PAGE_SIZE
        }
    };
}