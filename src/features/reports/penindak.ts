import { db } from "../../db/db_index";
import { categories, departments, reports, users } from "../../db/schema";
import { asc, eq, and } from 'drizzle-orm';
import { PAGE_SIZE } from "../shared";

export async function getPenindakReports(userId: string, departmentId: number, currentPage: number = 1) {
    const all_reports = db.select({
        id: reports.id,
        title: reports.title,
        description: reports.description,
        locationDetail: reports.locationDetail,
        likes: reports.likes,
        authorName: users.name,
        authorId: users.id,
        departmentName: departments.name,
        categoriesName: categories.name
    })
        .from(reports)
        .innerJoin(users, eq(users.id, reports.authorId))
        .innerJoin(departments, eq(departments.id, departmentId))
        .innerJoin(categories, eq(categories.id, reports.categoryId))
        .where(and(
            eq(reports.isDeleted, false),
        ))
        .limit(PAGE_SIZE)
        .offset((currentPage - 1) * PAGE_SIZE);
    return all_reports;
}