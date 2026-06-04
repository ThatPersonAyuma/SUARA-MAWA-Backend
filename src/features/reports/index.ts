import { Elysia, t } from "elysia";
import { createReport, getMyReports } from "./mahasiswa";
import { createFeedback, getAllCategories, getAllDepartments, getAllPublicReports, getAllReportStatus, getReportDetail, getReportEvidences, getReportFeedback } from "./all";
import { isNumeric } from "../shared";


export function reportSetup(app: Elysia){
    app.group('/mahasiswa', 
        {
            auth: true,
        },
        (myApp)=> 
        myApp.post("/report/create", async ({ body: { title,description,locationLat,
                locationLong,isPublic,departmentId,categoryId, files, names },
                user })=>{
            createReport(
                user.id,
                title,
                description,
                locationLat,
                locationLong,
                isPublic,
                departmentId,
                categoryId,
                files,
                names
            )
        }, {
                body: t.Object({
                    title: t.String(),
                    description: t.String(),
                    locationLat: t.Numeric(),
                    locationLong: t.Numeric(),
                    isPublic: t.BooleanString(),
                    departmentId: t.Numeric(),
                    categoryId: t.Numeric(),
                    files: t.Files(),
                    names: t.Array(t.Nullable(t.String())),
                }),
        })
        .get('/my-reports/:currentPage', async ({params:{currentPage}, user})=>{
            if (currentPage==null)return{
                'status':'failed',
                'message':'Current Page tidak ada'
            };
            if (!isNumeric(currentPage))return{
                'status':'failed',
                'message':'Current Page harus numeric'
            }
            return await getMyReports(user.id, Number(currentPage));
        })
    )
    .group('/report', 
        {
            auth: true
        }, 
        (myApp)=>{
        return myApp
            .get('/department/all', ()=>{
                return getAllDepartments();
            })
            .get('/category/all', ()=>{
                return getAllCategories();
            }) 
            .get('/status/all', ()=>{
                return getAllReportStatus(); // return list
            })
            .get('/all/:currentPage', async ({params:{currentPage}})=>{
                if (!isNumeric(currentPage))return{
                    'status':'failed',
                    'message':'Id harus numeric'
                }
                return await getAllPublicReports(Number(currentPage));
            })
            .post('/detail', async ({body:{reportId}})=>{
                return await getReportDetail(reportId);
            }, {
                body:t.Object({
                    reportId: t.Number()
                })
            })
            .get("/evidence/:reportEvidenceId/preview", async ({ params: {reportEvidenceId}, set })=>{
                if (reportEvidenceId==null)return{
                    'status':'failed',
                    'message':'Nama file tidak ada'
                };
                if (!isNumeric(reportEvidenceId))return{
                    'status':'failed',
                    'message':'Id harus numeric'
                }
                const id = Number(reportEvidenceId);
                
                set.headers["Content-Disposition"] = "inline";
                
                const res = await getReportEvidences(id)
                if(res['status']=='success'){
                    return res['data'];
                }else{
                    return res;
                }
            },)
            .get("/evidence/:reportEvidenceId/download", async ({ params: {reportEvidenceId}, set })=>{
                if (reportEvidenceId==null)return{
                    'status':'failed',
                    'message':'Nama file tidak ada'
                };
                if (!isNumeric(reportEvidenceId))return{
                    'status':'failed',
                    'message':'Id harus numeric'
                }
                const id = Number(reportEvidenceId);
                
                const res = await getReportEvidences(id);
                
                if (res['status']=='success'){
                    console.log("runned");
                    set.headers[
                        "Content-Disposition"
                    ] = `attachment; filename="${res['data']!.name}"`;
                    return res['data']!;
                }else{
                    return res;
                }
            },)
            .group('/feedback', ()=>
                app
                .post('/create', ({body:{ reportId, status, description, files, names,}, user})=>{
                    return createFeedback(user.id, reportId, status, description, files, names);
                },{
                    body: t.Object({
                        reportId: t.Number(),
                        status: t.String(),
                        description: t.String(),
                        files: t.Nullable(t.Array(t.File())),
                        names: t.Nullable(t.Array(t.Nullable(t.String())))
                    })
                })
                .post('/detail',  ({body:{reportStatusId}})=>{
                    return getReportFeedback(reportStatusId);
                }, {
                    body: t.Object({
                        reportStatusId: t.Number()
                    })
                })
            )
        ;
    })
    ;
} 