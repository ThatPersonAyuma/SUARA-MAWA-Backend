import { Elysia, t } from "elysia";
import { getPhotoProfile, storePhotoProfile } from "./fs";

export function fs_setup(app: Elysia){
    app.get("/users/:name/profile/photo", async ({ params: { name }, user })=> {
            return await getPhotoProfile(name);
        }, {
                // @ts-expect-error
                auth: true
            })
        .post("/users/profile/photo/upload", async ({ body: { file }, user })=>{
            storePhotoProfile(file, user.id, user.photoProfileId);
            return `Received: ${file.name} by ${user.name}`;
        }, {
                body: t.Object({
                    file: t.File()
                }),
                auth: true
        });
} 