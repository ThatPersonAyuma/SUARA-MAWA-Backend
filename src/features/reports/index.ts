
// export function get_all_report(report_id: number, strict_visible: boolean=false){
//     const conditions = [eq(reports.id, report_id)];

//     // Jika strict_visible bernilai true, tambahkan filter isPublic harus true
//     if (strict_visible) {
//         conditions.push(eq(reports.isPublic, true));
//     }
//     const all_reports = db.select()
//             .from(reports)
//             .limit(1)
//             .where(eq(reports.id, report_id));
//     return all_reports;
// }