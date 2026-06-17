import { db } from "../../db/db_index";
import { asc, eq, and, count, sql, desc } from 'drizzle-orm';
import { categories, departments, feedbackAttachments, feedbacks, reportEvidences, reports, reportStatus, reportStatusEnum, users, reportLikes, comments } from "../../db/schema";
import { PAGE_SIZE } from "../shared";
import { reportSetup } from ".";
import { getFile, storeFile } from "../filesystem/fs_utils";
import { REPORT_EVIDENCE_FOLDER, FEEDBACK_ATTACHMENT_FOLDER } from "./shared";
import { boss } from "../PG-BOSS";

export async function getAllPublicReports(currentPage: number = 1, userId?: string) {
    const offset = (currentPage - 1) * PAGE_SIZE;

    const latestStatusQuery = sql`(SELECT status FROM report_status WHERE report_id = ${reports.id} ORDER BY changed_at DESC, id DESC LIMIT 1)`;
    const thumbnailQuery = sql`(SELECT re.id FROM report_evidences re JOIN files f ON re.file_id = f.id WHERE re.report_id = ${reports.id} AND f.filetype = 'image' ORDER BY re.id ASC LIMIT 1)`;
    const createdAtQuery = sql`(SELECT changed_at FROM report_status WHERE report_id = ${reports.id} ORDER BY changed_at ASC, id ASC LIMIT 1)`;
    const likesQuery = sql`(SELECT COUNT(*) FROM report_likes WHERE report_id = ${reports.id} AND like_status = true)`;
    const isLikedQuery = userId ? sql`(SELECT EXISTS(SELECT 1 FROM report_likes WHERE report_id = ${reports.id} AND user_id = ${userId} AND like_status = true))` : sql`false`;

    // Run the data fetch and the total count concurrently
    const [data, countResult] = await Promise.all([
        db.select({
            id: reports.id,
            title: reports.title,
            description: reports.description,
            location: reports.location,
            likes: sql<number>`${likesQuery}`.as('likes'),
            isLiked: sql<boolean>`${isLikedQuery}`.as('isLiked'),
            authorName: users.name,
            departmentName: departments.name,
            categoriesName: categories.name,
            latestStatus: sql<string>`${latestStatusQuery}`.as('latestStatus'),
            thumbnail: sql<number>`${thumbnailQuery}`.as('thumbnail'),
            createdAt: sql<Date>`${createdAtQuery}`.as('createdAt')
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

    const mappedData = data.map(report => ({
        ...report,
        thumbnail: report.thumbnail ? `/report/evidence/${report.thumbnail}/preview` : null
    }));

    return {
        data: mappedData,
        meta: {
            totalRows,
            totalPages,
            currentPage: currentPage,
            PAGE_SIZE,
        }
    };
}

export async function getReportDetail(reportId: number, userId?: string) {
    const res = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        extras: {
            likes: sql<number>`(SELECT COUNT(*) FROM report_likes WHERE report_id = ${reports.id} AND like_status = true)`.as('likes'),
            isLiked: userId ? sql<boolean>`(SELECT EXISTS(SELECT 1 FROM report_likes WHERE report_id = ${reports.id} AND user_id = ${userId} AND like_status = true))`.as('isLiked') : sql<boolean>`false`.as('isLiked')
        },
        with: {
            author: {
                columns: {
                    name: true,
                    photoProfileId: true
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
                    status: true,
                    changedAt: true
                },
                with: {
                    changedById: {
                        columns: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });

    if (!res) {
        return {
            'status': 'failed',
            'message': 'Report not found'
        };
    }

    // Sort reportStatus by changedAt ascending to find the earliest date
    const sortedStatuses = [...res.reportStatus].sort((a, b) => {
        const dateA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
        const dateB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
        return dateA - dateB;
    });

    const reportDate = sortedStatuses.length > 0 ? sortedStatuses[0]?.changedAt : null;

    const mappedReportStatus = res.reportStatus.map(status => ({
        id: status.id,
        status: status.status,
        created_at: status.changedAt,
        author: status.changedById
    }));

    const mappedData = {
        ...res,
        author: {
            ...res.author,
            url_foto_profil: res.author.photoProfileId ? `/users/${encodeURIComponent(res.author.name)}/profile/photo` : null
        },
        report_date: reportDate,
        reportStatus: mappedReportStatus
    };

    return {
        'status': 'success',
        'data': mappedData
    };
}

export async function getReportFeedback(reportStatusId: number) {
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
                        with: {
                            file: true
                        },
                        columns: {
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
                columns: {
                    name: true
                }
            }
        },
        columns: {
            fileId: true
        }
    });
    if (res == null) return {
        'status': 'failed',
        'message': 'reportEvidenceTidakDitemukan'
    };
    return {
        'status': 'success',
        'data': await getFile(`${REPORT_EVIDENCE_FOLDER}/${res.file.name}`)
    };
}

export async function createFeedback(userId: string, reportId: number, status: string, description: string, files: File[] | null, names: (string | null)[] | null) {
    if ((files == null) !== (names == null)) {
        return {
            'status': 'failed',
            'message': 'Pastikan files dan names berjumlah sama'
        }
    }
    const rs_res = await db.insert(reportStatus)
        .values({
            reportId: reportId,
            status: status as any,
            changedById: userId
        }).returning({ insertedId: reportStatus.id });
    if (rs_res[0] == null) return {
        'status': 'failed',
        'message': 'Gagal menambahkan report status'
    };
    const fb_res = await db.insert(feedbacks)
        .values({
            reportStatusId: rs_res[0]!.insertedId,
            description: description
        }).returning({ insertedId: feedbacks.id });
    if (fb_res[0] == null) return {
        'status': 'failed',
        'message': 'Gagal menambahkan feedback'
    };
    if (files != null && names != null) {
        if (files.length != names.length) {
            return {
                'status': 'failed',
                'messgae': 'Jumlah file harus sama dengan jumlah nama file'
            }
        }
        for (let i = 0; i < files.length; i++) {
            const storeFileId = await storeFile(files[i], names[i]!, FEEDBACK_ATTACHMENT_FOLDER);
            if (storeFileId == null) {
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
        await boss.send(
            'on-reportStatus-changed',
            {
                reportId: reportId,
                status: status
            }
        )
        return {
            'status': 'success',
            'message': 'Berhasil memberikan feedback'
        }
    } else {
        return {
            'status': 'success',
            'message': 'Berhasil memberikan feedback'
        }
    }
}

export async function getFeedbackAttachment(feedbackAttachmentId: number) {
    const res = await db.query.feedbackAttachments.findFirst({
        where: eq(feedbackAttachments.id, feedbackAttachmentId),
        with: {
            file: {
                columns: {
                    name: true
                }
            }
        },
        columns: {
            fileId: true
        }
    });
    if (res == null) return {
        'status': 'failed',
        'message': 'reportEvidenceTidakDitemukan'
    };
    return {
        'status': 'success',
        'data': await getFile(`${FEEDBACK_ATTACHMENT_FOLDER}/${res.file.name}`)
    };
}

export async function getAllReportStatus() {
    return reportStatusEnum.enumValues;
}

export function getAllDepartments() {
    return db.select().from(departments);
}

export function getAllCategories() {
    return db.select().from(categories);
}

export async function getReportsByDepartmentAndStatus(departmentId: number, status: string, currentPage: number = 1) {
    const offset = (currentPage - 1) * PAGE_SIZE;

    const latestStatusQuery = sql`(SELECT status FROM report_status WHERE report_id = ${reports.id} ORDER BY changed_at DESC, id DESC LIMIT 1)`;
    const thumbnailQuery = sql`(SELECT re.id FROM report_evidences re JOIN files f ON re.file_id = f.id WHERE re.report_id = ${reports.id} AND f.filetype = 'image' ORDER BY re.id ASC LIMIT 1)`;
    const createdAtQuery = sql`(SELECT changed_at FROM report_status WHERE report_id = ${reports.id} ORDER BY changed_at ASC, id ASC LIMIT 1)`;
    const likesQuery = sql`(SELECT COUNT(*) FROM report_likes WHERE report_id = ${reports.id} AND like_status = true)`;

    const [data, countResult] = await Promise.all([
        db.select({
            id: reports.id,
            title: reports.title,
            description: reports.description,
            location: reports.location,
            likes: sql<number>`${likesQuery}`.as('likes'),
            authorName: users.name,
            departmentName: departments.name,
            categoriesName: categories.name,
            latestStatus: sql<string>`${latestStatusQuery}`.as('latestStatus'),
            thumbnail: sql<number>`${thumbnailQuery}`.as('thumbnail'),
            createdAt: sql<Date>`${createdAtQuery}`.as('createdAt')
        })
            .from(reports)
            .innerJoin(users, eq(users.id, reports.authorId))
            .innerJoin(departments, eq(departments.id, reports.departmentId))
            .innerJoin(categories, eq(categories.id, reports.categoryId))
            .where(and(
                eq(reports.departmentId, departmentId),
                eq(reports.isDeleted, false),
                eq(latestStatusQuery, status)
            ))
            .limit(PAGE_SIZE)
            .offset(offset),
        db.select({ total: count() }).from(reports).where(and(
            eq(reports.departmentId, departmentId),
            eq(reports.isDeleted, false),
            eq(latestStatusQuery, status)
        ))
    ]);

    const totalRows = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalRows / PAGE_SIZE);

    const mappedData = data.map(report => ({
        ...report,
        thumbnail: report.thumbnail ? `/report/evidence/${report.thumbnail}/preview` : null
    }));

    return {
        data: mappedData,
        meta: {
            totalRows,
            totalPages,
            currentPage: currentPage,
            PAGE_SIZE,
        }
    };
}

export async function toggleLikeReport(userId: string, reportId: number) {
    const existingLike = await db.query.reportLikes.findFirst({
        where: and(eq(reportLikes.userId, userId), eq(reportLikes.reportId, reportId))
    });

    if (existingLike) {
        await db.update(reportLikes)
            .set({ likeStatus: !existingLike.likeStatus })
            .where(eq(reportLikes.id, existingLike.id));
        return { status: 'success', message: existingLike.likeStatus ? 'Like removed' : 'Like added' };
    } else {
        await db.insert(reportLikes).values({ userId, reportId, likeStatus: true });
        return { status: 'success', message: 'Like added' };
    }
}

export async function addComment(userId: string, reportId: number, commentText: string) {
    const res = await db.insert(comments).values({
        userId,
        reportId,
        comment: commentText
    }).returning();

    if (res.length > 0) {
        return { status: 'success', message: 'Comment added', data: res[0] };
    }
    return { status: 'failed', message: 'Failed to add comment' };
}

export async function getComments(reportId: number) {
    const res = await db.query.comments.findMany({
        where: eq(comments.reportId, reportId),
        orderBy: [desc(comments.createdAt)],
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    photoProfileId: true
                }
            }
        }
    });

    const mappedComments = res.map(comment => ({
        ...comment,
        user: {
            ...comment.user,
            url_foto_profil: comment.user.photoProfileId ? `/users/${encodeURIComponent(comment.user.name)}/profile/photo` : null
        }
    }));

    return { status: 'success', data: mappedComments };
}