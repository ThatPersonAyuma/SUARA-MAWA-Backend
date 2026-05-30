import { getWhatsApp } from "./client";

export async function sendWhatsAppOTP(
  phoneNumber: string,
  otp: string,
) {

  const sock = getWhatsApp();

  const formatted =
    phoneNumber
      .replace(/^0/, "62")
      .replace(/\+/g, "");

  const jid =
    `${formatted}@s.whatsapp.net`;

  const exists =
    await sock.onWhatsApp(formatted);

  if (!exists?.[0]?.exists) {
    throw new Error(
      "Nomor tidak terdaftar di WhatsApp"
    );
  }

  await sock.sendMessage(jid, {
    text:
`🔐 *Kode OTP Anda*

${otp}

Kode berlaku selama 5 menit.`,
  });

  return true;
}
