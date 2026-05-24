import Elysia, { t } from "elysia";
import { db } from "../../db/db_index";
import { users } from "../../db/schema";
import { PAGE_SIZE } from "./shared";

export function get_users(currentPage: number){
    const all_users = db.select()
        .from(users)
        .limit(PAGE_SIZE)
        .offset((currentPage-1) * PAGE_SIZE);
    return all_users;
}
export function user_setup(){
    const app = new Elysia();
    app.group('/users', (app)=>app
        .get('/all', ({ query: {page} })=>{
            if (page==null||page<=0){
                page=1
            }
            return get_users(page);
        }, {
            query: t.Object({
                page: t.Optional(t.Number())
            })
        })
    );
    return app;
}