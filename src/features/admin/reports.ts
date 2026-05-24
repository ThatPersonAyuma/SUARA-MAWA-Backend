import Elysia, { t } from "elysia";
import { db } from "../../db/db_index";
import { reports } from "../../db/schema";
import { PAGE_SIZE } from "./shared";

export function get_reports(currentPage: number){
    const all_reports = db.select()
        .from(reports)
        .limit(PAGE_SIZE)
        .offset((currentPage-1) * PAGE_SIZE);
    console.log(all_reports);
    return all_reports;
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
    );
    return app;
}