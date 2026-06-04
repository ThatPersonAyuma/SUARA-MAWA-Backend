import { db } from "../../db/db_index";
import { categories, DEFAULT_REPORT_STATUS, departments, reportEvidences, reports, reportStatus, reportStatusEnum, users } from "../../db/schema";
import { storeFile } from "../filesystem/fs_utils";
import { asc, eq, and } from 'drizzle-orm';
import { PAGE_SIZE } from "../shared";
import { REPORT_EVIDENCE_FOLDER } from "./shared";

export async function createReport(
    userId: string,
    title: string,
    description: string,
    locationLat: number,
    locationLong: number,
    isPublic: boolean,
    departmentId: number,
    categoryId: number,
    reportEvidenceFiles: File[],
    names: (string | null)[]
){
    try{
        if (reportEvidenceFiles.length != names.length){
            return {
                'status':'failed',
                'messgae':'Jumalah file harus sama dengan jumlah nama'
            }
        }
        // create report
        const res = await db.insert(reports)
            .values({
                authorId: userId,
                departmentId: departmentId,
                title: title,
                description: description,
                locationLat: locationLat,
                locationLong: locationLong,
                isPublic: isPublic,
                categoryId: categoryId,
            }).returning({insertedId: reports.id});
        if (res[0]==null)return{
            'status':'failed',
            'message':'gagal membuat report'
        };
        // Create report status
        const rs_res = await db.insert(reportStatus)
            .values({
                reportId: res[0].insertedId,
                changedById: userId,
                status: DEFAULT_REPORT_STATUS
            })
        // Save all of the attachments
        for (let i = 0; i < reportEvidenceFiles.length; i++) {
            const storeFileId = await storeFile(reportEvidenceFiles[i], names[i]!, REPORT_EVIDENCE_FOLDER);
            if (storeFileId==null){
                return {
                    'status': 'failed',
                    'message': 'Tidak bisa menyimpan file'
                }
            }
            await db.insert(reportEvidences)
                .values({
                    reportId: res[0]!.insertedId,
                    fileId: storeFileId
                });
        }
        return {
            'status': 'success',
            'message':'Semua file berhasil disimpan'
        }
    }catch(e){
        return {
            'status': 'failed',
            'message': e
        }
    }
}

export async function getMyReports(userId: string, currentPage: number=1){
    const all_reports = db.select({
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
            eq(reports.isDeleted, false),
            eq(reports.authorId, userId)
        ))
        .limit(PAGE_SIZE)
        .offset((currentPage-1) * PAGE_SIZE);
    return all_reports;
}

