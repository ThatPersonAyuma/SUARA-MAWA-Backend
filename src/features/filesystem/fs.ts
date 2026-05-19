import { file, status } from 'elysia';
import { db } from '../../db/db_index';
import { files } from '../../db/app_schema';
import { eq } from 'drizzle-orm';
import { users } from '../../db/auth_schema';

export async function getPhotoProfile(userId: string){
    console.log(userId);
    const user = await db.query.users.findFirst({
                        where: eq(users.id, userId),
                        with: {
                                photoProfile: {
                                columns: { name: true},
                            }
                        }
                    });
    if (user==undefined) return status(404);
    if (user.photoProfile==undefined) return status(204);
    return file(`storage/profile/${user.photoProfile.name}`);
}