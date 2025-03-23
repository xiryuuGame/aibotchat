const ai = require("./function/ai");
const generateImage = require("./function/imageGeneration");
const makeWASocket = require("@fizzxydev/baileys-pro").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} = require("@fizzxydev/baileys-pro");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");

async function bot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const logger = pino({ level: "silent" });
  let chalk;
  import("chalk").then((module) => {
    chalk = module.default;

    // will use the given state to connect
    // so if valid credentials are available -- it'll connect without QR
    const sock = makeWASocket({
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
    });

    // this will be called as soon as the credentials are updated
    sock.ev.on("creds.update", saveCreds);

    if (!sock.authState.creds.registered) {
      const phoneNumber = "62895622331910";
      setTimeout(async () => {
        const pairCode = "11111111";
        let code = await sock.requestPairingCode(phoneNumber, pairCode);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(
          chalk.black(chalk.bgGreen("Your pairing code : ")),
          chalk.black(chalk.white(code)),
        );
      }, 2000);
    }
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      console.log("connection update", update);

      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom &&
          lastDisconnect.error?.output?.statusCode !==
            DisconnectReason.loggedOut;
        console.error(
          "Connection Closed:",
          lastDisconnect?.error || "Unknown Reason",
        );
        if (shouldReconnect) {
          console.log("Attempting to reconnect...");
          bot().catch(console.error);
        } else {
          console.log(
            "Connection closed. You are logged out or an unrecoverable error occurred.",
          );
        }
      }
    });
    sock.ev.on("messages.upsert", async (msgUpdate) => {
      if (msgUpdate.type === "notify") {
        let m = msgUpdate.messages[0];
        let from = m.key.remoteJid || m.key.participant || m.participant;
        let author = m.participant || m.key.participant || m.key.remoteJid;
        let isGroup = from.endsWith("@g.us");
        let toggleAigroup = JSON.parse(fs.readFileSync("./list.json")).includes(
          from,
        );

        m.chat = getMessage(m.message);
        m.username = m.pushName;

        console.log(chalk.black(chalk.bgGreen("Message : ")), m.chat);
        console.log(
          chalk.black(chalk.bgGreen("From : ")),
          author,
          isGroup
            ? `${chalk.black(chalk.bgGreen("From Group : "))} ${from}`
            : "",
        );
        console.log(
          chalk.black(chalk.bgGreen("RAW : ")),
          chalk.gray(JSON.stringify(m, null, 2)),
        );

        if (toggleAigroup) {
          const response = await ai(m, sock);
          sock.sendMessage(from, { text: response }, { quotedMessage: m });
        }
      }
    });
  });
}

function getMessage(message) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    message.buttonsResponseMessage?.selectedButtonId ||
    (() => {
      try {
        return JSON.parse(
          message.interactiveResponseMessage?.nativeFlowResponseMessage
            ?.paramsJson,
        ).id;
      } catch (e) {
        return "";
      }
    })() ||
    ""
  );
}
function listTools() {
  return [{ generateImage: { prompt } }, { google: { query, page } }];
}
bot();
module.exports = { listTools };
