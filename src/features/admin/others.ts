import Elysia, { t } from "elysia";

// function get_all_report(){}

export function others_setup(){
    const app = new Elysia();
    // app.post('/report', ({ body: {reportId}, user })=>{
            
    //     },{
    //         body:t.Object({
    //             reportId: t.Number()
    //         })
    //     }
    // );
    return app;
}