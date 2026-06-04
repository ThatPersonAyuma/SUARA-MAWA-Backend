import { describe, expect, it } from "bun:test";
import { app } from "../../../main";

describe("POST /mahasiswa", () => {
    it("should create report", async () => {
        const form = new FormData();

        form.append("title", "Jalan Rusak");
        form.append("description", "Terdapat jalan rusak");
        form.append("locationLat", "-6.2");
        form.append("locationLong", "106.8");
        form.append("isPublic", "true");
        form.append("departmentId", "1");
        form.append("categoryId", "1");

        form.append(
            "files",
            Bun.file('storage/logo.png')
        );

        const response = await app.handle(
            new Request("https://manifesto-sincere-domelike.ngrok-free.dev/mahasiswa/report/create", {
                method: "POST",
                body: form,
                headers: {
                    Authorization: "Bearer Sq0c2uKrcJ59VzL09uRVaGiMLQjZpQGz"
                }
            })
        );
        expect(response.status).toBe(200);
    });
});