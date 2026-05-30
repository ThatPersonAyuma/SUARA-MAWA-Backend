import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";

import P from "pino";
import qrcode from "qrcode-terminal";

let sock: any = null;

export async function initWhatsApp() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./baileys_auth");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    browser: ["Bun Server", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on(
    "connection.update",
    async ({
      connection,
      qr,
      lastDisconnect,
    }) => {

      if (qr) {
        qrcode.generate(qr, {
          small: true,
        });
      }

      if (connection === "open") {
        console.log("WhatsApp connected");
      }

      if (connection === "close") {

        const shouldReconnect =
          (lastDisconnect?.error as any)?.output
            ?.statusCode !== DisconnectReason.loggedOut;

        console.log(
          "WhatsApp disconnected"
        );

        if (shouldReconnect) {
          await initWhatsApp();
        }
      }
    }
  );

  return sock;
}

export function getWhatsApp() {
  if (!sock) {
    throw new Error(
      "WhatsApp not initialized"
    );
  }

  return sock;
}
