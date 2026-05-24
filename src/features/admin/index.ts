import { Elysia, t } from "elysia";
import { report_setup } from "./reports";
import { user_setup } from "./users";
import { others_setup } from "./others";
import { userAc } from "better-auth/plugins/admin/access";

export function admin_setup(app: Elysia){
    app.group('/admin', (app)=>app
        .guard({
            // beforeHandle({headers, status, user}){
            //     console.log(`This is before handle\n${user}`);
            //     // Cek if user is admin
            // },
            auth: true,
            afterHandle({headers, status, user}){
                // Cek if user is admin
                if (user!=null && user.userRole.name!="ADMIN"){
                    const err = new Error('Unauthorized');
                    err.status = 401;
                    throw err;
                }
            },
        })
        .use(report_setup())
        .use(user_setup())
        .use(others_setup())
    );
}