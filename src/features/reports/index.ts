import { Elysia, t } from "elysia";
import { createReport, getMyReports } from "./mahasiswa";
import { createFeedback, getAllCategories, getAllDepartments, getAllPublicReports, getAllReportStatus, getFeedbackAttachment, getReportDetail, getReportEvidences, getReportFeedback, getReportsByDepartmentAndStatus } from "./all";
import { isNumeric } from "../shared";


export function reportSetup(app: Elysia) {
    app.group('/mahasiswa',
        {
            auth: true,
        },
        (myApp) =>
            myApp.post("/report/create", async ({ body: { title, description, locationLat,
                locationLong, locationDetail, isPublic, departmentId, categoryId, files, names },
                user }) => {
                return await createReport(
                    user.id,
                    title,
                    description,
                    locationLat,
                    locationLong,
                    locationDetail ?? null,
                    isPublic,
                    departmentId,
                    categoryId,
                    files ?? [],
                    names ?? []
                );
            }, {
                body: t.Object({
                    title: t.String(),
                    description: t.String(),
                    locationLat: t.Numeric(),
                    locationLong: t.Numeric(),
                    locationDetail: t.Optional(t.String()),
                    isPublic: t.BooleanString(),
                    departmentId: t.Numeric(),
                    categoryId: t.Numeric(),
                    files: t.Optional(t.Files()),
                    names: t.Optional(t.Array(t.Nullable(t.String()))),
                }),
            })
                .get('/my-reports', async ({ query: { currentPage }, user }) => {
                    return await getMyReports(user.id, currentPage);
                }, {
                    query: t.Object({
                        currentPage: t.Optional(t.Number())
                    })
                })
    )
        .group('/report',
            {
                auth: true
            },
            (myApp) => {
                return myApp
                    .get('/department/all', () => {
                        return getAllDepartments();
                    })
                    .get('/category/all', () => {
                        return getAllCategories();
                    })
                    .get('/status/all', () => {
                        return getAllReportStatus(); // return list
                    })
                    .get('/all', async ({ query: { currentPage } }) => {
                        // if (!isNumeric(currentPage))return{
                        //     'status':'failed',
                        //     'message':'Id harus numeric'
                        // }
                        return await getAllPublicReports(currentPage);
                    }, {
                        query: t.Object({
                            currentPage: t.Optional(t.Number())
                        })
                    })
                    .get('/filter', async ({ query: { departmentId, status, currentPage } }) => {
                        return await getReportsByDepartmentAndStatus(departmentId, status, currentPage);
                    }, {
                        query: t.Object({
                            departmentId: t.Numeric(),
                            status: t.String(),
                            currentPage: t.Optional(t.Numeric())
                        })
                    })
                    .post('/detail', async ({ body: { reportId } }) => {
                        return await getReportDetail(reportId);
                    }, {
                        body: t.Object({
                            reportId: t.Number()
                        })
                    })
                    .get("/evidence/:reportEvidenceId/preview", async ({ params: { reportEvidenceId }, set }) => {
                        if (reportEvidenceId == null) return {
                            'status': 'failed',
                            'message': 'Nama file tidak ada'
                        };
                        if (!isNumeric(reportEvidenceId)) return {
                            'status': 'failed',
                            'message': 'Id harus numeric'
                        }
                        const id = Number(reportEvidenceId);

                        set.headers["Content-Disposition"] = "inline";

                        const res = await getReportEvidences(id)
                        if (res['status'] == 'success') {
                            return res['data'];
                        } else {
                            return res;
                        }
                    },)
                    .get("/evidence/:reportEvidenceId/download", async ({ params: { reportEvidenceId }, set }) => {
                        if (reportEvidenceId == null) return {
                            'status': 'failed',
                            'message': 'Nama file tidak ada'
                        };
                        if (!isNumeric(reportEvidenceId)) return {
                            'status': 'failed',
                            'message': 'Id harus numeric'
                        }
                        const id = Number(reportEvidenceId);

                        const res = await getReportEvidences(id);

                        if (res['status'] == 'success') {
                            set.headers[
                                "Content-Disposition"
                            ] = `attachment; filename="${res['data']!.name}"`;
                            return res['data']!;
                        } else {
                            return res;
                        }
                    },)
                    .group('/feedback', (feedbackApp) =>
                        feedbackApp
                            .post('/create', ({ body: { reportId, status, description, files, names, }, user }) => {
                                return createFeedback(user.id, reportId, status, description, files, names);
                            }, {
                                body: t.Object({
                                    reportId: t.Number(),
                                    status: t.String(),
                                    description: t.String(),
                                    files: t.Nullable(t.Array(t.File())),
                                    names: t.Nullable(t.Array(t.Nullable(t.String())))
                                })
                            })
                            .post('/detail', ({ body: { reportStatusId } }) => {
                                return getReportFeedback(reportStatusId);
                            }, {
                                body: t.Object({
                                    reportStatusId: t.Number()
                                })
                            })
                            .get("/:feedbackAttachmentId/preview", async ({ params: { feedbackAttachmentId }, set }) => {
                                if (feedbackAttachmentId == null) return {
                                    'status': 'failed',
                                    'message': 'Id tidak ada'
                                };
                                if (!isNumeric(feedbackAttachmentId)) return {
                                    'status': 'failed',
                                    'message': 'Id harus numeric'
                                }
                                const id = Number(feedbackAttachmentId);

                                set.headers["Content-Disposition"] = "inline";

                                const res = await getFeedbackAttachment(id)
                                if (res['status'] == 'success') {
                                    return res['data'];
                                } else {
                                    return res;
                                }
                            },)
                            .get("/:feedbackAttachmentId/download", async ({ params: { feedbackAttachmentId }, set }) => {
                                if (feedbackAttachmentId == null) return {
                                    'status': 'failed',
                                    'message': 'ID tidak ada'
                                };
                                if (!isNumeric(feedbackAttachmentId)) return {
                                    'status': 'failed',
                                    'message': 'Id harus numeric'
                                }
                                const id = Number(feedbackAttachmentId);

                                const res = await getFeedbackAttachment(id);

                                if (res['status'] == 'success') {
                                    set.headers[
                                        "Content-Disposition"
                                    ] = `attachment; filename="${res['data']!.name}"`;
                                    return res['data']!;
                                } else {
                                    return res;
                                }
                            },)
                    )
                    ;
            })
        ;
} 