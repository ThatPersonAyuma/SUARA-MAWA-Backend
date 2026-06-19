import { Elysia, file } from 'elysia';
import { auth_setup } from './src/features/auth/index';
import { cors } from '@elysia/cors'
import { fs_setup } from './src/features/filesystem/index';
import { admin_setup } from './src/features/admin';
import { initWhatsApp } from "./src/features/auth/whatsapp/client";
import { reportSetup } from './src/features/reports';
import { messaging } from './src/features/firebase/firebase';
import { firebaseSetup } from './src/features/firebase';
import { setupPgBoss } from './src/features/PG-BOSS';

export const app = new Elysia();

async function main() {

    await initWhatsApp();

    console.log("Server started");
    app.onRequest(({ request }) => {
        console.log(request.method, request.url);
    });
    auth_setup(app);
    app.onError(({ code, error }) => {
        console.log(code);
        console.log(error);
    });
    app.use(
        cors({
            credentials: true,
            origin: 'http://localhost:5500',
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
        })
    );
    fs_setup(app);
    admin_setup(app);
    reportSetup(app);
    firebaseSetup(app);
    // Only for testing, comment setupPgBoss
    await setupPgBoss(app);
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
        .get('/send', ({query: {cookie}})=>{
            console.log(cookie)
        })
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
            return Bun.file('./pages/verified.html');
        }, {
        })
        .get('/reset-password', ({})=>{
            return Bun.file('./pages/reset_password.html');
        }, {
        })
        .get('/reset-password/success', ({})=>{
            return Bun.file('./pages/reset_success.html');
        }, {
        })
        .get('/set-cookie', ({set})=>{
            set.headers["Set-Cookie"] =
                "__Secure-better-auth.session_token=Sq0c2uKrcJ59VzL09uRVaGiMLQjZpQGz.AcZx550udZfTmgeAu8KqEQfErWzoni2aslTX8hViKog%3D; Path=/; HttpOnly; Secure; SameSite=Lax";
        })
        .listen({
            port: 3000,
            hostname: Bun.env.BASE_URL // Binds to all network interfaces
        });
    console.log(`Listening on ${app.server!.url}`);
}

main();