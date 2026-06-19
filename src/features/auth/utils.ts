import { PAGE_SIZE } from "../shared";
import { db } from "../../db/db_index";
import { adminDetails, mahasiswaDetails, penindakDetails, users } from "../../db/schema";
import { and, count, eq, ilike, or } from "drizzle-orm";

export async function getAllUser(roleId: number|undefined, keyword: string|undefined, currentPage: number = 1) {
    const offset = (currentPage - 1) * PAGE_SIZE;
    const conditions = [];
    if (roleId!=null)
        conditions.push(eq(users.userRoleId, roleId));

    if (keyword!=null)
        conditions.push(
            or(
                ilike(users.name, `%${keyword}%`),
                ilike(users.email, `%${keyword}%`),
                ilike(mahasiswaDetails.nim, `%${keyword}%`),
                ilike(penindakDetails.nik, `%${keyword}%`),
                ilike(adminDetails.nik, `%${keyword}%`),
            )
        );
    // Run the data fetch and the total count concurrently
    const [data, countResult] = await Promise.all([
        db.query.users.findMany({
            columns:{
                id: true,
                name: true,
                email: true,
                lastLogin: true,
                phoneNumber: true
            },
            with:{
                userRole:{
                    columns:{
                        name: true
                    }
                },
                mahasiswaDetails:{
                    columns:{
                        nim: true
                    }
                },
                penindakDetails:{
                    columns: {
                        nik: true,
                    },
                    with:{
                        department:{
                            columns:{
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                adminDetails:{
                    columns:{
                        nik: true
                    }
                }
            },
            where: conditions.length
            ? and(...conditions)
            : undefined,
            limit: PAGE_SIZE,
            offset: offset
        }),
        db.select({ total: count() }).from(users).where(and(
            conditions.length
            ? and(...conditions)
            : undefined,
        ))
    ]);

    const totalRows = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);

    return {
        data: data,
        meta: {
            totalRows,
            totalPages,
            currentPage: currentPage,
            PAGE_SIZE,
        }
    };
}