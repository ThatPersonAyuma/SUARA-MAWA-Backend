import Elysia from "elysia";
import { getPhotoProfile } from "./fs";


export function fs_setup(app: Elysia){
    app.get("/users/:id/profile/photo", async ({ params: { id }, user })=> {
        return await getPhotoProfile(id);
    }, {
            // @ts-expect-error
            auth: true
        })
} 