import { db } from "../../db/db_index";
import { asc, eq, and, count } from 'drizzle-orm';
import { categories, departments, feedbackAttachments, feedbacks, reportEvidences, reports, reportStatus, reportStatusEnum, users } from "../../db/schema";
import { PAGE_SIZE } from "../shared";
import { reportSetup } from ".";
import { getFile, storeFile } from "../filesystem/fs_utils";
import { REPORT_EVIDENCE_FOLDER } from "./shared";

const FEEDBACK_ATTACHMENT_FOLDER = "storage/feedback_attachments";

export async function getAllPublicReports(currentPage: number = 1){
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
            categoriesName: categories.name
        })
        .from(reports)
        .innerJoin(users, eq(users.id, reports.authorId))
        .innerJoin(departments, eq(departments.id, reports.departmentId))
        .innerJoin(categories, eq(categories.id, reports.categoryId))
        .where(and(
            eq(reports.isPublic, true),
            eq(reports.isDeleted, false)
        ))
        .limit(PAGE_SIZE)
        .offset(offset),
        db.select({ total: count() }).from(reports).where(and(
            eq(reports.isPublic, true),
            eq(reports.isDeleted, false)
        ))
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

export async function getReportDetail(reportId: number){
    const res = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        with: {
            author: {
                columns:{
                    name: true
                }
            },
            department: {
                columns: {
                    name: true
                }
            },
            category: {
                columns: {
                    name: true
                }
            },
            reportEvidences: {
                columns: {
                    id: true,
                },
                with: {
                    file: true
                }
            },
            reportStatus: {
                columns: {
                    id: true,
                    status: true
                },
            }
        }
    })
    return {
        'status':'success',
        'data':res
    };
}

export async function getReportFeedback(reportStatusId: number){
    return await db.query.reportStatus.findMany({
        where: eq(reportStatus.id, reportStatusId),
        columns: {
            id: true,
            status: true,
            changedAt: true,
        },
        with: {
            feedback: {
                columns: {
                    id: true,
                    description: true
                },
                with: {
                    feedbackAttachments: {
                        with:{
                            file: true
                        },
                        columns:{
                            id: true
                        }
                    }
                }
            },
            changedById: {
                columns: {
                    id: true,
                    name: true
                }
            }
        }
    })
}

export async function getReportEvidences(reportEvidenceId: number) {
    const res = await db.query.reportEvidences.findFirst({
        where: eq(reportEvidences.id, reportEvidenceId),
        with: {
            file: {
                columns:{
                    name: true
                }
            }
        },
        columns: {
            fileId: true
        }
    });
    if (res==null)return{
        'status': 'failed',
        'message':'reportEvidenceTidakDitemukan'
    };
    return {
        'status':'success',
        'data' : await getFile(`${REPORT_EVIDENCE_FOLDER}/${res.file.name}`)
    };
}

export async function createFeedback(userId: string, reportId: number, status: string, description: string, files: File[]|null, names: (string|null)[]|null) {
    if ((files==null) !== (names==null)){
        return {
            'status':'failed',
            'message':'Pastikan files dan names berjumlah sama'
        }
    }
    const rs_res = await db.insert(reportStatus)
        .values({
            reportId: reportId,
            status: status,
            changedById: userId
        }).returning({insertedId: reportStatus.id});
    if(rs_res[0]==null)return{
        'status':'failed',
        'message':'Gagal menambahkan report status'
    };
    const fb_res = await db.insert(feedbacks)
        .values({
            reportStatusId: rs_res[0]!.insertedId,
            description: description
        }).returning({insertedId: feedbacks.id});
    if(fb_res[0]==null)return{
        'status':'failed',
        'message':'Gagal menambahkan feedback'
    };
    if (files!=null && names!=null){
        if (files.length != names.length){
            return {
                'status':'failed',
                'messgae':'Jumlah file harus sama dengan jumlah nama file'
            }
        }
        for (let i = 0; i < files.length; i++) {
            const storeFileId = await storeFile(files[i], names[i]!, FEEDBACK_ATTACHMENT_FOLDER);
            if (storeFileId==null){
                return {
                    'status': 'failed',
                    'message': 'Tidak bisa menyimpan file'
                }
            }
            await db.insert(feedbackAttachments)
                .values({
                    feedbackId: fb_res[0]!.insertedId,
                    fileId: storeFileId
                });
        }
        return {
            'status': 'success',
            'message':'Berhasil memberikan feedback'
        }
    }else{
        return {
            'status':'success',
            'message':'Berhasil memberikan feedback'
        }
    }
}

export async function getAllReportStatus(){
    return reportStatusEnum.enumValues;
}

export function getAllDepartments(){
    return db.select().from(departments);
}

export function getAllCategories(){
    return db.select().from(categories);
}