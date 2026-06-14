# suara-mawa

# Setup

## Database
Ensure the database is clean, if not clean it first<br>
Also run the server because account creation need the server for better auth user creation<br>
1. Migrate database
   ```bash
   npm run predev
   ```
2. Seed database
   ```bash
   npm run db:seed
   ```

## Running Server
1. Static, best for deploy
   ```bash
   npm run start
   ```
2. Dynamic, best for development where every change will take effect immediately and reload the server. Note it's better to not using WhatsApp/OTP feature as start it will take more time
   ```bash
   npm run startdev
   ```

Follow these steps to run [Elysia.js](https://elysiajs.com) under [Bun](https://bun.sh):

1. Download packages
   ```bash
   bun install
   ```
2. You're ready to go!
   ```bash
   bun run main.ts
   ```

