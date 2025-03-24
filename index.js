const ai = require("./function/ai");
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

        m.chat = getMessage(m.message) || "";
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

        if (m.chat === ".toggle") {
          const list = JSON.parse(fs.readFileSync("./list.json"));
          const index = list.indexOf(from);
          if (index > -1) {
            list.splice(index, 1);
            fs.writeFileSync("./list.json", JSON.stringify(list));
            sock.sendMessage(
              from,
              {
                text: `Hore!! ${isGroup ? "Group" : "User"} sudah berhasil dimatikan dari fitur AI`,
              },
              { quotedMessage: m },
            );
          } else {
            list.push(from);
            fs.writeFileSync("./list.json", JSON.stringify(list));
            sock.sendMessage(
              from,
              {
                text: `Hore!! ${isGroup ? "Group" : "User"} sudah berhasil ditambahkan ke fitur AI`,
              },
              { quotedMessage: m },
            );
          }
          return;
        }
        if (toggleAigroup) {
          const response = await ai(m, sock, "");
          console.log(response);
          let isTools = response.match(/(\[.*?\])(\(.*?\))/);
          if (isTools) {
            const key = await sock.sendMessage(
              from,
              { text: response },
              { quotedMessage: m },
            );
            // console.log(key);
            const tools = listTools();
            const toolName = isTools[1].slice(1, -1);
            const toolPrompt = isTools[2].slice(1, -1);
            const tool = tools.find((tool) => tool[toolName]);
            const toolResponse = await tool[toolName](toolPrompt);
            console.log(toolResponse);
            const response2 = await ai(m, sock, `${toolResponse}`);
            console.log(response2);

            sock.sendMessage(
              from,
              { text: response2, edit: key.key },
              { quotedMessage: m },
            );
            return;
          }

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
const jadwalTugasFunction = require("./function/jadwaltugas");
const jadwalPiketFunction = require("./function/jadwalpiket");

function listTools() {
  return [
    { jadwaltugas: (any) => jadwalTugasFunction() },
    { jadwalpiket: (any) => jadwalPiketFunction() },
  ];
}
bot();
module.exports = { listTools };
