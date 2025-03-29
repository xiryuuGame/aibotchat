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
const global = JSON.parse(fs.readFileSync("bot-config.json"));

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
      const phoneNumber = global.number;
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

        // Logic untuk menyimpan data user ke user.json
        try {
          const userData = JSON.parse(fs.readFileSync("./db/user.json"));
          const userExists = userData.find((user) => user.number === author);

          if (!userExists) {
            userData.push({ number: author, username: m.pushName });
            fs.writeFileSync(
              "./db/user.json",
              JSON.stringify(userData, null, 2),
            );
            console.log(`User baru ditambahkan: ${author} - ${m.username}`);
          } else {
          }
        } catch (error) {
          console.error("Gagal menyimpan data user:", error);
        }
        // End logic penyimpanan user
        console.log(m.message?.protocolMessage?.type);
        if (m.message?.protocolMessage?.type === 0) return;

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
          // Jalankan pemrosesan AI di latar belakang
          Promise.resolve().then(async () => {
            const response = await ai(m, sock, "");
            console.log(response);

            // Fungsi ekstrak nilai dalam kurung yang diperbarui
            function ekstrakNilaiDalamKurung(inputString) {
              const regex = /\[.*?\]\((.*?)\)$/;
              const match = inputString.match(regex);

              if (match && match[1]) {
                const nilaiDalamKurung = match[1];
                const arrayNilai = [];
                let currentNilai = "";
                let dalamKutipan = false;

                for (let i = 0; i < nilaiDalamKurung.length; i++) {
                  const karakter = nilaiDalamKurung[i];

                  if (karakter === '"') {
                    dalamKutipan = !dalamKutipan;
                    currentNilai += karakter;
                  } else if (karakter === "," && !dalamKutipan) {
                    arrayNilai.push(currentNilai.trim());
                    currentNilai = "";
                  } else {
                    currentNilai += karakter;
                  }
                }

                arrayNilai.push(currentNilai.trim());
                return arrayNilai;
              } else {
                return [];
              }
            }

            // Mengganti ekstraksi nilai dengan fungsi yang diperbarui
            let isTools = [];
            const toolMatches = [...response.matchAll(/\[(.*?)\]\((.*?)\)$/gm)];
            for (const toolMatch of toolMatches) {
              const toolName = toolMatch[1];
              const toolArgs = ekstrakNilaiDalamKurung(toolMatch[0]); // Menggunakan fungsi ekstrakNilaiDalamKurung
              isTools.push({ toolName, toolArgs });
            }

            console.log(isTools);

            if (isTools.length > 0) {
              const key = await sock.sendMessage(
                from,
                { text: response },
                { quotedMessage: m },
              );
              let combinedResponse = "";
              for (const toolObj of isTools) {
                const toolName = toolObj.toolName;
                const toolArgs = toolObj.toolArgs;
                const tools = listTools(sock, from);
                const tool = tools.find((tool) => tool[toolName]);

                let toolResponse;
                if (toolName === "groupinformation") {
                  toolResponse = await tool[toolName]();
                } else {
                  toolResponse = await tool[toolName](...toolArgs); // Menggunakan spread operator untuk mengirimkan argumen
                }
                console.log(`Tool Response (${toolName}):`, toolResponse);
                const response2 = await ai(
                  m,
                  sock,
                  `Tool Response (${toolName}):${toolResponse}`,
                );
                console.log(`AI Response after Tool (${toolName}):`, response2);
                combinedResponse = `${response2}`;
              }

              sock.sendMessage(
                from,
                { text: combinedResponse, edit: key.key },
                { quotedMessage: m },
              );
              return;
            }

            sock.sendMessage(from, { text: response }, { quotedMessage: m });
          });
        } else {
          // Logic history grup
          try {
            let history = JSON.parse(
              fs.readFileSync(`./AIHistory/${from}.json`),
            );
            // Get quoted message content
            const quotedMessage =
              m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedfromparticipant =
              m.message?.extendedTextMessage?.contextInfo?.participant;
            const quotedContent = await getQuotedMessageContent(
              quotedMessage,
              sock,
            );
            let quotedMessageText = "";
            let quotedfromusername = "unknown"; // Default username

            const users = JSON.parse(
              fs.readFileSync("./db/user.json", "utf-8"),
            ); // Baca data user

            const quotedParticipantNumber = quotedfromparticipant
              ? quotedfromparticipant.split("@")[0] + "@s.whatsapp.net"
              : null; // Ekstrak nomor

            if (quotedParticipantNumber) {
              const user = users.find(
                (u) => u.number === quotedParticipantNumber,
              );
              if (user) {
                quotedfromusername = user.username;
              }
            }

            if (quotedContent) {
              if (quotedContent.imageBase64) {
                quotedMessageText += `imagePath: ${randomFileName}\n\n[IMAGE]`;
              }
              if (quotedContent.text) {
                quotedMessageText += `<reply message>from ${quotedfromusername}/${quotedfromparticipant} : ${quotedContent.text}</reply message>`;
              }
            }
            let messageText = `from ${m.pushName}/${author} : ` + m.chat;
            const newMessage = {
              role: "user",
              content: quotedMessageText
                ? `${quotedMessageText} ${messageText}`
                : messageText,
            };
            history.messages.push(newMessage);
            history.lastInteraction = Date.now();
            if (history.messages.length >= 100) {
              history.messages = history.messages.slice(1);
            }
            fs.writeFileSync(
              `./AIHistory/${from}.json`,
              JSON.stringify(history, null, 2),
            );
          } catch (error) {
            console.error("Gagal menyimpan history grup:", error.message);
          }
          // End logic history grup
        }
      }
    });
  });
}

function getMessage(message) {
  try {
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
  } catch (error) {
    console.error("Error in getMessage function:", error);
    return "";
  }
}
const jadwalTugasFunction = require("./function/jadwaltugas");
const jadwalPiketFunction = require("./function/jadwalpiket");
const groupInformationFunction = require("./function/groupinformation");
const notedFunction = require("./function/noted");
const iGen = require("./function/imagegenerate");
const gempaFunction = require("./function/gempa");

function listTools(sock, from) {
  return [
    { jadwaltugas: () => jadwalTugasFunction() },
    { jadwalpiket: () => jadwalPiketFunction() },
    { groupinformation: () => groupInformationFunction(sock, from) },
    { noted: (note) => notedFunction(note) },
    { generateimage: (path, prompt) => iGen(path, prompt, sock, from) },
    { gempa: () => gempaFunction() },
  ];
}
async function getQuotedMessageContent(quotedMessage, sock) {
  if (!quotedMessage) {
    return null;
  }

  let quotedText = "";
  let quotedImageBase64 = null;

  // Handle botInvokeMessage (self-replies)
  if (quotedMessage.botInvokeMessage) {
    const botMessage = quotedMessage.botInvokeMessage.message;
    if (botMessage?.extendedTextMessage?.text) {
      quotedText = botMessage.extendedTextMessage.text;
    }
  }
  // Handle regular quoted messages
  else {
    if (quotedMessage.conversation) {
      quotedText = quotedMessage.conversation;
    } else if (quotedMessage.extendedTextMessage?.text) {
      quotedText = quotedMessage.extendedTextMessage.text;
    } else if (quotedMessage.imageMessage?.caption) {
      quotedText = quotedMessage.imageMessage.caption;
    } else if (quotedMessage.videoMessage?.caption) {
      quotedText = quotedMessage.videoMessage.caption;
    }

    if (quotedMessage.imageMessage) {
      try {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: quotedMessage.imageMessage } }, // Reconstruct a minimal message
          "buffer",
          {},
          { logger: console },
        );
        fs.writeFileSync(randomFileName, buffer);
        quotedImageBase64 = buffer.toString("base64");
      } catch (error) {
        console.error("Error downloading or processing quoted image:", error);
      }
    }
  }

  return { text: quotedText, imageBase64: quotedImageBase64 };
}
bot();
module.exports = { listTools };
