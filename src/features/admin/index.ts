import Elysia from "elysia";
import { report_setup } from "./reports";
import { user_setup } from "./users";

export function admin_setup(app: Elysia){
    app.group('/admin', (app)=>app
        .guard({
            auth: true
        })
        .use(report_setup())
        .use(user_setup())
    );
}