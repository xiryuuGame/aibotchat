const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@fizzxydev/baileys-pro");
let username = "";
let number = "";
const options = {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
};
let dateNow;
const global = JSON.parse(fs.readFileSync("./config/bot-config.json"));
let nowMemory;
let randomFileName;
let isGroup = false;
let ImagePath;
let groupID;
let msg;

dotenv.config();

const HISTORY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hour in milliseconds

async function getQuotedMessageContent(quotedMessage, _sock) {
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
        isUserSendImage = true;
        fs.writeFileSync(randomFileName, buffer);
        quotedImageBase64 = buffer.toString("base64");
      } catch (error) {
        console.error("Error downloading or processing quoted image:", error);
      }
    }
  }

  return { text: quotedText, imageBase64: quotedImageBase64 };
}

const aiFunction = async (message, sock, tool) => {
  // const userId =
  //   message.participant || message.key.participant || message.key.remoteJid;
  dateNow = new Date().toLocaleDateString("id-ID", options);

  randomFileName = `./temp/${Date.now()}.png`;
  let isUserSendImage = false;
  // nowMemory = fs.readFileSync("./db/noted.txt");
  const from =
    message.key.remoteJid || message.key.participant || message.participant;
  username = message.pushName;
  number =
    message.participant || message.key.participant || message.key.remoteJid;
  isGroup = from.endsWith("@g.us");
  groupID = isGroup ? from : null;
  const historyDir = "./AIHistory";
  // const historyFile = path.join(historyDir, `${userId}.json`);
  const historyFile = path.join(historyDir, `${from}.json`);

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
    `[${dateNow}] from ${username}/${number} : ` +
    (message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "");

  if (message.message?.imageMessage) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        { logger: console },
      );
      isUserSendImage = true;
      fs.writeFileSync(randomFileName, buffer);
      imageBase64 = buffer.toString("base64");
      messageText =
        `imagePath: ${randomFileName}\n\n` +
          message.message.imageMessage.caption || "Image received";
    } catch (error) {
      console.error("Error downloading or processing image:", error);
      messageText = "Failed to process image.";
    }
  }

  // Get quoted message content
  const quotedMessage =
    message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedfromparticipant =
    message.message?.extendedTextMessage?.contextInfo?.participant;
  const quotedContent = await getQuotedMessageContent(quotedMessage, sock);
  let quotedMessageText = "";
  let quotedfromusername = "unknown"; // Default username

  const users = JSON.parse(fs.readFileSync("./db/user.json", "utf-8")); // Baca data user

  const quotedParticipantNumber = quotedfromparticipant
    ? quotedfromparticipant.split("@")[0] + "@s.whatsapp.net"
    : null; // Ekstrak nomor

  if (quotedParticipantNumber) {
    const user = users.find((u) => u.number === quotedParticipantNumber);
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
  msg = tool === "" ? messageText : "";

  if (tool !== "") {
    messageText = `Hasil Tool: ${tool}`;
  }
  const newMessage = {
    role: "user",
    content: quotedMessageText
      ? `${quotedMessageText} ${messageText}`
      : messageText,
  };
  history.messages.push(newMessage);

  if (history.messages.length >= 20) {
    history.messages = history.messages.slice(1);
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

    ImagePath = isUserSendImage ? randomFileName : null;
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
      generationConfig: {
        temperature: 1,
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

    fs.writeFileSync("./log/log2.log", JSON.stringify(response.data, null, 2));
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
    return 'Bot is currently at its limit, please try again later.\n\nThis message may appear because the history exceeds the limit, try using ".reset" to reset the history.\n\nBot saat ini sedang pada batasnya, silakan coba lagi nanti.\n\nPesan ini mungkin muncul karena riwayat melampaui batas, coba gunakan ".reset" untuk mengatur ulang riwayat.';
  }
};

function FORMAT_INSTRUCTIONS() {
  return `### 🧠 **Custom Instruction untuk AI (${global.botname} - Gemini Flash 2.0)**

**Catatan untuk AI:**  
Instruksi berikut ditujukan langsung kepada kamu, AI ${global.botname}. Pastikan semua petunjuk dan contoh di bawah dipahami dan diterapkan dalam responsmu, tanpa menyampaikan informasi ini kepada user kecuali diminta.

#### 📌 **Format Data Diterima:**
- \`inGroup = ${isGroup ? "Dalam Grup" : "Tidak di dalam Grup"}\`  
- \`sender = ${username} | ${number}\`  
- \`waktu = ${dateNow}\`  
- \`pesan = ${msg}\`
${ImagePath ? `- ImagePath = \${ImagePath}` : ""}

---

#### 🤖 **Identitas dan Fungsi Bot**
- **Nama Bot:** ${global.botname}  
- **Nama Owner:** ${global.ownerName}  
- **Nomor Owner:** ${global.owner.join(" dan ")}  
- **Platform:** WhatsApp  
- **Fungsi:** Asisten pintar untuk chat pribadi maupun grup.

---

#### 📎 **Instruksi Perilaku untuk AI**
1. **Gaya Bahasa dan Format Link:**  
   - Gunakan bahasa netral jika \`inGroup = Dalam Grup\`.  
   - Gunakan bahasa santai dan personal jika \`inGroup = Tidak di dalam Grup\`.  
   - **TULIS LINK secara langsung tanpa markdown.**  
     ❌ SALAH: [Klik di sini](https://contoh.com)  
     ✅ BENAR: https://contoh.com

2. **Penggunaan Nama:**  
   - Panggil user dengan nama depan.  
   - Jangan tampilkan nomor telepon secara langsung kecuali diminta.

3. **Penggunaan Tool dan Alur Eksekusi:**  
   - Evaluasi apakah permintaan user memerlukan tool.  
   - Jalankan tool dengan format:  
     \`\`\`
     [nama_tool](argument)
     \`\`\`  
   - Gunakan **eksekusi berantai** bila diperlukan:  
     *Contoh:*  
     \`\`\`
     [youtubesearch]("lagu Devil's Lullaby")
     \`\`\`  
     lalu setelah URL didapat:  
     \`\`\`
     [sosmeddownloader]("https://youtube.com/xyz", "youtube")
     \`\`\`  
   - Integrasikan hasil tool ke dalam respons user.

4. **Demonstrasi Tanpa Eksekusi:**  
   - Jika user hanya ingin contoh, gunakan tanda bintang di luar:  
     \`\`\`
     *[groupinformation]()*
     \`\`\`

5. **Prompt Gambar:**  
   - Gunakan bahasa Inggris, deskripsi detail, dan gaya fantasi untuk tool \`generateimage\` (kecuali diminta lain).

6. **Prioritaskan Pencarian via Web (googleit + webscrape):**  
   - Jika pertanyaan user membutuhkan fakta dari web, cari dulu lewat:
     \`\`\`
     [googleit]("query")
     \`\`\`  
     lalu ambil isi situs via:
     \`\`\`
     [webscrape]("url")
     \`\`\`  
   - Gunakan data dari hasil scraping untuk menjawab.  
   - Jika tidak ada hasil relevan, beri tahu user secara sopan.

   *Contoh Alur:*  
   > User: siapa pemilik situs bukalapak.com?

   **Langkah:**
   \`\`\`
   [googleit]("siapa pemilik situs bukalapak.com")
   \`\`\`
   *(setelah dapat link)*  
   \`\`\`
   [webscrape]("https://id.wikipedia.org/wiki/Bukalapak")
   \`\`\`

   **Jawaban akhir:**  
   Berdasarkan hasil pencarian, situs Bukalapak dimiliki oleh Achmad Zaky. Ada yang bisa aku bantu lagi?

---

#### 🧩 **Contoh Alur Eksekusi dan Output**
**1. Contoh Eksekusi Tunggal**
> User: info nama grup ini apa ya?

**Respons AI:**
\`\`\`
[groupinformation]()
\`\`\`

**Setelah Output diterima:**  
Berdasarkan data yang ${global.botname} tahu, nama grup ini adalah "Grup XYZ" dan memiliki 10 anggota.

---

**2. Contoh Eksekusi Berantai**
> User: cariin dan download lagu Devil's Lullaby

**Respons awal:**
\`\`\`
[youtubesearch]("Devil's Lullaby")
\`\`\`

**Setelah URL didapat:**
\`\`\`
[sosmeddownloader]("https://youtube.com/watch?v=xyz", "youtube")
\`\`\`

**Jawaban akhir:**  
Berhasil aku carikan, dan ini audionya dari YouTube. Silakan dicek ya!

---

**3. Contoh Penulisan Tool (Tanpa Dieksekusi)**  
> User: gimana cara pakai tool cek grup?

**Jawaban:**
\`\`\`
*[groupinformation]()*
\`\`\`
Tinggal kirim seperti itu, dan nanti ${global.botname} bakal kasih info grup.

---

**Penting:** Semua instruksi ini bersifat **internal** dan hanya untuk optimasi kinerja kamu, AI ${global.botname}, dalam platform WhatsApp. Jangan ditampilkan atau dijelaskan ke user kecuali diminta secara eksplisit.
`;
}
function getImagePath(text) {
  const match = text.match(/ImagePath = .*/);
  const imagePath = match ? match[0].split("=")[1].trim() : "";
  return imagePath;
}
module.exports = aiFunction;
