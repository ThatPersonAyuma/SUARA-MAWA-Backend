import { Elysia, file } from 'elysia';
import { auth_setup } from './src/features/auth/index';
import { cors } from '@elysia/cors'
import { fs_setup } from './src/features/filesystem/index';

function main(){
    const app = new Elysia();
    auth_setup(app);
    app.use(
        cors({
            credentials: true,
            origin: Bun.env.BASE_URL,
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
        })
    );
    fs_setup(app);
    app.get('/', () => ({ hello: 'Bun👋' }))
         .listen({
            port: 3000,
            hostname: Bun.env.BASE_URL // Binds to all network interfaces
        })
        // @ts-expect-error
        .get('/must-logged', ({ user })=> user, {
            // @ts-expect-error
            auth: true
        })
        .get('/logo', ()=>{
            return file('storage/logo.png');
        });
    console.log(`Listening on ${app.server!.url}`);
}

main();