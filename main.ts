import { Elysia, file } from 'elysia';
import { auth_setup } from './src/features/auth/index';
import { cors } from '@elysia/cors'
import { fs_setup } from './src/features/filesystem/index';
import { admin_setup } from './src/features/admin';
import { initWhatsApp } from "./src/features/auth/whatsapp/client";

async function main() {

    // await initWhatsApp();

    // console.log("Server started");
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
    admin_setup(app);
    app.get('/', () => ({ hello: 'Bun👋' }), {
            auth:true
        })
        .get('/check-login', ({ user })=> user, {
            // @ts-expect-error
            auth: true
        })
        .get('/email-verified', 
            ({ user })=> user, {
            // @ts-expect-error
            onboardAuth: true
        }
        )
        .get('/logo', ()=>{
            return file('storage/logo.png');
        })
        .get('/favicon.ico', ()=>{
            return file('storage/favicon.ico');
        })
        .get('.well-known/assetlinks.json', ()=>{
            return file('storage/assetlinks.json');
        })
        .get('/email-verified', ({})=>{
            return Bun.file('./verified.html');
        }, {
        })
        .listen({
            port: 3000,
            hostname: Bun.env.BASE_URL // Binds to all network interfaces
        });
    console.log(`Listening on ${app.server!.url}`);
}

main();