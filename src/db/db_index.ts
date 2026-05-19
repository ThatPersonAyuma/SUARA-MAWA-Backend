import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as auth_schema from './auth_schema';
import * as schema from './app_schema';

export const db = drizzle(process.env.DATABASE_URL!, {
    schema: {
        ...auth_schema,
        ...schema
    }
});