const listTools = require("../index");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@fizzxydev/baileys-pro");
let username = "";
const options = {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};
let dateNow = new Date().toLocaleDateString("id-ID", options);

dotenv.config();

const HISTORY_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

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
        quotedImageBase64 = buffer.toString("base64");
      } catch (error) {
        console.error("Error downloading or processing quoted image:", error);
      }
    }
  }

  return { text: quotedText, imageBase64: quotedImageBase64 };
}

const aiFunction = async (message, sock, tool) => {
  const userId =
    message.participant || message.key.participant || message.key.remoteJid;
  username = message.pushName;
  const historyDir = "./AIHistory";
  const historyFile = path.join(historyDir, `${userId}.json`);

  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir);
  }

  let history = {
    messages: [],
    lastInteraction: null,
    messages: [],
  };

  if (fs.existsSync(historyFile)) {
    try {
      const fileContent = fs.readFileSync(historyFile, "utf-8");
      history = JSON.parse(fileContent);
    } catch (error) {
      console.error("Error parsing history file, resetting history:", error);
      history = {
        messages: [],
        lastInteraction: null,
      };
    }

    if (
      history.lastInteraction &&
      Date.now() - history.lastInteraction > HISTORY_TIMEOUT
    ) {
      history = {
        messages: [],
        lastInteraction: null,
      };
    }
  }

  let imageBase64 = null;
  let messageText =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    "";
  messageText = messageText.replace(".ai ", "");

  if (message.message?.imageMessage) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        { logger: console },
      );
      imageBase64 = buffer.toString("base64");
      messageText = message.message.imageMessage.caption || "Image received";
    } catch (error) {
      console.error("Error downloading or processing image:", error);
      messageText = "Failed to process image.";
    }
  }

  // Get quoted message content
  const quotedMessage =
    message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedContent = await getQuotedMessageContent(quotedMessage, sock);
  let quotedMessageText = "";

  if (quotedContent) {
    if (quotedContent.imageBase64) {
      quotedMessageText += `[IMAGE]`;
    }
    if (quotedContent.text) {
      quotedMessageText += `<reply message>${quotedContent.text}</reply message>`;
    }
  }

  if (tool !== "") {
    messageText =
      "INSTRUCTION: ini adalah hasil dari tools yang kamu gunakan sebelumnya. tulis ulang response kamu sebelumnya dengan sama persis tetapi hapus teks tool nya. lanjut jawaban mu dengan informasi hasil toolsnya:\n\n" +
      tool;
  }
  const newMessage = {
    role: "user",
    content: quotedMessageText
      ? `${quotedMessageText} ${messageText}`
      : messageText,
  };
  history.messages.push(newMessage);

  if (history.messages.length > 10) {
    history.messages = history.messages.slice(history.messages.length - 5);
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    let parts = [];

    // Handle image and text together
    if (imageBase64 || quotedContent?.imageBase64) {
      let imageData = imageBase64 || quotedContent?.imageBase64;
      let mimeType = "image/jpeg"; // Default to JPEG, adjust if needed

      // Add history messages
      history.messages.forEach((m) => {
        parts.push({
          role: m.role,
          parts: [{ text: m.content }],
        });
      });

      // Add the current image and text
      parts.push({
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageData,
            },
          },
          {
            text: messageText,
          },
        ],
      });
    } else {
      // Construct the parts array from the message history
      history.messages.forEach((m) => {
        parts.push({
          role: m.role,
          parts: [{ text: m.content }],
        });
      });
    }

    const data = {
      contents: parts.length > 0 ? parts : [{ parts: [{ text: messageText }] }],
      system_instruction: {
        parts: {
          text: FORMAT_INSTRUCTIONS(),
        },
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "OFF",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "OFF",
        },
      ],
      tools: [
        {
          googleSearch: {},
        },
      ],
      generationConfig: {
        temperature: 0.0,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
    };

    const options = {
      method: "POST",
      url: url,
      headers: {
        "Content-Type": "application/json",
      },
      data,
    };

    const response = await axios(options);

    let reply = "";
    const parts2 = response.data.candidates[0].content.parts;

    if (Array.isArray(parts2)) {
      reply = parts2.map((part) => part.text).join("");
    } else if (parts2 && parts2.text) {
      reply = parts2.text;
    }

    history.messages.push({ role: "model", content: reply });
    history.lastInteraction = Date.now();

    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    return reply;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Bot is currently at its limit, please try again later.";
  }
};

function FORMAT_INSTRUCTIONS() {
  return `Kamu adalah bot whatsapp bernama Xiryuu. kamu bertugas untuk membantu User dengan segala permasalahannya. kamu berkepribadian asik menyenangkan seperti seorang gen Z, gunakan juga bahasa bahasa gaul. Dalam percakapan kamu, kamu dapat menggunakan tools yang tersedia seperti Google, generateImage,dll.
tools adalah alat yang berada dalam database yang bisa kamu gunakan jika sepertinya user butuh.

berikut merupakan detail yang sepertinya harus kamu ingat:
  nama kamu: Xiryuu
  nama lawan bicara kamu saat ini: ${username}
  waktu saat ini: ${dateNow}
  note: mungkin nama kamu akan sama dengan orang lain, tidak apa apa

ini adalah list tools yang bisa kamu pakai saat ini:
  - generateImage(prompt) - Generate gambar dengan prompt yang kamu berikan
  - jadwaltugas() - Memberikan jadwal mata pelajaran yang sudah ada di dalam database
  - Gimage(query, amount) - Mencari gambar berdasarkan query dan jumlah yang hendak dicari

cara kamu menggunakan tools nya(contoh response. note: ini adalah contoh buatan manusia. kamu dapat membuat jawaban sesuai preferensi kamu sendiri):
  1.user: cariin gambar macan dong. 3 foto 

    kamu: kamu mau nyari gambar macan? bentar ya bro aku cariin....
        
          [Gimage]("macan", 3)
  2.user: tolong buatin gambar kucing naik kuda berkaki tujuh dong.

    kamu: kucing naik kuda berkaki tujuh?? ada ada aja. yodah sini ku generate-in, sabar yaa....

          [generateImage]("kucing naik kuda berkaki tujuh")
  3.ini contoh contoh penggunaan tool:
      - [Gimage]("macan", 3)
      - [generateImage]("kucing naik kuda berkaki tujuh")
      - [jadwaltugas]()
      - dll
    pastikan menggunakan tool dengan format [namatool] kemudian dilanjutkan dengan () dengan argument jika dibutuhkan

pastikan kamu menggunakan tools hanya diakhir atau awal kalimat dengan jarak garis baru. dan juga gunakan satu tools dalam satu waktu. jangan berlebih 
`;
}
module.exports = aiFunction;
