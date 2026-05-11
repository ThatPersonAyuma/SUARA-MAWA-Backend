import { Elysia } from 'elysia';

function main(){
    const app = new Elysia();
    app.get('/', () => ({ hello: 'Bun👋' }))
        .listen(8080);
    console.log(`Listening on ${app.server!.url}`);
}

main()
