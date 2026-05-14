import { Elysia } from 'elysia';
import { setup } from './src/features/auth/index';

function main(){
    const app = new Elysia();
    setup(app);
    app.get('/', () => ({ hello: 'Bun👋' }))
        .listen(8080);
    console.log(`Listening on ${app.server!.url}`);
}

main()
