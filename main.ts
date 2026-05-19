import { Elysia } from 'elysia';
import { setup } from './src/features/auth/index';

function main(){
    const app = new Elysia();
    setup(app);
    app.get('/', () => ({ hello: 'Bun👋' }))
         .listen({
            port: 3000,
            hostname: 'localhost' // Binds to all network interfaces
        });
    console.log(`Listening on ${app.server!.url}`);
}

main()
