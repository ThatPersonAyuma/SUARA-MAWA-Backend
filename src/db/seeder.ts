/* #region Seed and Query */
import { eq } from 'drizzle-orm';
import { categories, departments, userRoles} from './app_schema';
import { db } from './db_index';

async function seeder() {
    console.log("⏳ Seeding database...");

    try {
        // 1. Seed User Roles
        console.log("Inserting roles...");
        await db.insert(userRoles).values([
        { name: "MAHASISWA" },
        { name: "DOSEN" },
        { name: "ADMIN" },
        ]).onConflictDoNothing();

        // 2. Seed Departments
        console.log("Inserting departments...");
        await db.insert(departments).values([
        { name: "Kemahasiswaan" },
        { name: "TU" },
        ]).onConflictDoNothing();

        // 3. Seed Categories
        console.log("Inserting categories...");
        await db.insert(categories).values([
        { name: "Prasarana" },
        { name: "Mata Kuliah" },
        { name: "Pengajar" },
        ]).onConflictDoNothing();

        console.log("✅ Seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding failed:");
        console.error(error);
        process.exit(1);
    } finally {
        // Tutup koneksi jika perlu (tergantung driver DB kamu)
        // await connection.end(); 
    }
}
seeder();
/* #endregion */