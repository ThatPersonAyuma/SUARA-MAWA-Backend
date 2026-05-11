/* #region Seed and Query */
import { eq } from 'drizzle-orm';
import { usersTable } from './schema';
import { db } from '../db_index';

async function seeder() {
    const user: typeof usersTable.$inferInsert = {
        fullName: 'John',
        age: 30,
        email: 'john@example.com',
    };
    await db.insert(usersTable).values(user);
    // console.log('New user created!')
    // const users = await db.select().from(usersTable);
    // console.log('Getting all users from the database: ', users)
    // /*
    // const users: {
    //   id: number;
    //   name: string;
    //   age: number;
    //   email: string;
    // }[]
    // */
    // await db
    //     .update(usersTable)
    //     .set({
    //         age: 31,
    //     })
    //     .where(eq(usersTable.email, user.email));
    // console.log('User info updated!')
    // await db.delete(usersTable).where(eq(usersTable.email, user.email));
    // console.log('User deleted!')
}
seeder();
/* #endregion */