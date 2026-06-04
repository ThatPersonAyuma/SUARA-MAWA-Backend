import Elysia, { t } from "elysia";
import { db } from "../../db/db_index";
import { categories, departments, reports,users } from "../../db/schema";
import { PAGE_SIZE } from "../shared";
import { count, eq } from 'drizzle-orm';
import { get_report_detail_admin } from "../reports/exposeToAdmin";

export async function get_reports(currentPage: number){
    const offset = (currentPage - 1) * PAGE_SIZE;
    
    // Run the data fetch and the total count concurrently
    const [data, countResult] = await Promise.all([
        db.select({
            id: reports.id,
            title: reports.title,
            description:reports.description,
            likes: reports.likes,
            authorName: users.name,
            departmentName: departments.name,
            categoriesName: categories.name,
            isPublic: reports.isPublic,
            isDeleted: reports.isDeleted
        })
        .from(reports)
        .innerJoin(users, eq(users.id, reports.authorId))
        .innerJoin(departments, eq(departments.id, reports.departmentId))
        .innerJoin(categories, eq(categories.id, reports.categoryId))
        .limit(PAGE_SIZE)
        .offset(offset),
        db.select({ total: count() }).from(reports)
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


export function report_setup(){
    const app = new Elysia();
    app.group('/reports', (app)=>app
        .get('/all', ({ query: {page} })=>{
            console.log("yeah");
            if (page==null||page<=0){
                page=1
            }
            return get_reports(page);
        }, {
            query: t.Object({
                page: t.Optional(t.Number())
            })
        })
        .post('/report', ({ body: {reportId}, user })=>{
            return get_report_detail_admin(reportId);
        },{
            body:t.Object({
                reportId: t.Number()
            })
        })
    );
    return app;
}

