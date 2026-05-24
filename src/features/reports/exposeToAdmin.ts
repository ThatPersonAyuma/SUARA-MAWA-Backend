import { reports } from '../../db/schema';
import { db } from "../../db/db_index";
import { eq } from "drizzle-orm";

export function get_report_detail_admin(report_id: number){
    const all_reports = db.query.reports.findFirst({
        where: eq(reports.id, report_id),
        with: {
            author: {
                columns:{
                    name: true
                }
            },
            department: {
                columns:{
                    name: true
                }
            },
            category: {
                columns:{
                    name: true
                }
            }
        },
    });
    return all_reports;
}