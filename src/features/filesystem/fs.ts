import { file, status, t } from 'elysia';
import { db } from '../../db/db_index';
import { files } from '../../db/app_schema';
import { eq } from 'drizzle-orm';
import { users } from '../../db/auth_schema';

export async function getPhotoProfile(name: string){
    const user = await db.query.users.findFirst({
                        where: eq(users.name, name),
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
export async function storePhotoProfile(file: any, userId: string, photoProfileId: number|null) {
    const extension = file.name.split('.').pop();
    const filename = `${Bun.randomUUIDv7()}.${extension}`;
    await Bun.write(`storage/profile/${filename}`, file);
    if (photoProfileId!= null){
        await db.update(files)
            .set({ name: filename })
            .where(eq(files.id, photoProfileId));
    }
    else{
        const res = await db.insert(files).values({
            name: filename,
            filetype: 'image',
        }).returning({insertedId: files.id});
        if (res[0]==null) return;
        await db.update(users)
            .set({photoProfileId: res[0]?.insertedId})
            .where(eq(users.id, userId));
    }
}