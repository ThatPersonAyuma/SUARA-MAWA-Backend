import { eq } from "drizzle-orm";
import { db } from "../../db/db_index";
import { users } from "../../db/schema";

export async function updateProfile(
    userId: string,
    
){
    {

    }
    await db.update(users)
        .set(data)
        .where(eq(users.id, userId));
}
