import { describe, expect, it } from "bun:test";

const BASE_URL = "http://localhost:8080";

describe("User Endpoint Testing", () => {
  
  // 1. Test Registrasi Mahasiswa
  it("Harus berhasil meregistrasi mahasiswa baru", async () => {
    const payload = {
        id: 1,
        fullName: "Budi Utomo",
        email: `budi.${Date.now()}@example.com`, // Email unik tiap test
        phoneNumber: "+628123456789",
        password: "passwordAman123"
    };

    const response = await fetch(`${BASE_URL}/user/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(await response.text());
    expect(response.status).toBe(201);
  });

  // 2. Test Update User
  it("Harus berhasil mengupdate data user", async () => {
    const payload = {
      id: 1, // Pastikan ID ini ada di DB dummy kamu
      fullName: "Budi Diperbarui",
      password: "newPassword321",
      email: "budi.update@example.com",
      phoneNumber: "+62899999999"
    };

    const response = await fetch(`${BASE_URL}/user/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(await response.text());
    expect(response.status).toBe(200);
  });
});