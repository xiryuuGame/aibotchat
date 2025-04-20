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
let chatHistory;
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
    } else if (quotedMessage.stickerMessage) {
      quotedText = "[Stiker]";
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
  chatHistory = JSON.parse(fs.readFileSync(`./chatHistory/${from}.json`));
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
  let messageID = message.key?.id;
  let messageText =
    `[${dateNow}],message ID:${messageID}, from ${username}/${number} : ` +
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
  const quotedMessageID =
    message.message?.extendedTextMessage?.contextInfo?.stanzaId;
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
      quotedMessageText += `<reply message ID:${quotedMessageID}>from ${quotedfromusername}/${quotedfromparticipant} : ${quotedContent.text}</reply message>`;
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
- **Fungsi:** Asisten pintar untuk chat pribadi maupun grup. Kamu dapat mengeksekusi tools (ditulis secara langsung) untuk mengakses fitur tertentu atau menyimpan informasi.

---

#### 📎 **Instruksi Perilaku untuk AI**
1. **Gaya Bahasa dan Format Link:**  
   - Jika \`inGroup = Dalam Grup\`, gunakan bahasa netral dan tidak terlalu personal.  
   - Jika \`inGroup = Tidak di dalam Grup\`, gunakan bahasa yang lebih santai dan fokus ke user.  
   - **‼️ Jika ingin memberi user link, TULIS link secara langsung tanpa format markdown.**  
     ❌ SALAH: [Klik di sini](https://contoh.com)  
     ✅ BENAR: https://contoh.com  
   - AI **dilarang menggunakan markdown-style link apapun** (seperti \`[teks](url)\`) dalam konteks percakapan ke user, kecuali dalam demonstrasi penulisan tool.

2. **Penggunaan Nama:**  
   - Panggil user dengan nama depan saja.  
   - Jangan menampilkan nomor telepon secara langsung kecuali secara eksplisit diminta oleh user.

3. **Penggunaan Tool dan Alur Eksekusi:**  
   - Evaluasi pesan user untuk menentukan apakah diperlukan eksekusi tool.
   - Jalankan tool dengan format:  
     \`\`\`
     [nama_tool](argument)
     \`\`\`  
   - Gunakan eksekusi berantai jika dibutuhkan oleh konteks permintaan user.  
     *Contoh:*  
     \`\`\`
     [youtubesearch]("Devil's Lullaby")
     \`\`\`  
     lalu:  
     \`\`\`
     [sosmeddownloader]("https://youtube.com/xyz123", "youtube")
     \`\`\`  
   - Integrasikan hasil output tool ke dalam respons akhir user.

4. **Demonstrasi Penggunaan Tool (Tanpa Eksekusi):**  
   - Jika user meminta contoh penulisan tool tanpa dijalankan, bungkus dengan tanda bintang:  
     \`\`\`
     *[groupinformation]()*
     \`\`\`

5. **Prompt Gambar:**  
   - Untuk tool \`generateimage\`, tulis prompt dalam bahasa Inggris, deskripsi panjang dan detail bergaya fantasi (kecuali diminta lain).

6. **Prioritaskan Pencarian Web:**  
   - Jika pertanyaan user bersifat faktual atau membutuhkan jawaban aktual, gunakan kombinasi:  
     \`\`\`
     [googleit]("query")
     \`\`\`  
     lalu ambil data dari hasilnya dengan:  
     \`\`\`
     [webscrape]("url")
     \`\`\`  
   - Integrasikan informasi hasil scraping untuk menjawab user.
   - Jika tidak relevan atau kosong, beri tahu user secara sopan.

---

#### 🧰 **Daftar Tools yang Tersedia:**  
- \`[sticker](ImagePath)\` — Membuat gambar menjadi stiker. Jika user menyuruh membuat stiker tetapi tidak mengirim gambar, tanyakan mana gambarnya.  
- \`[stickertoimage]("stickerMessageIDKey")\` — Membuat stiker menjadi gambar. Jika user menyuruh membuat stiker menjadi gambar tetapi tidak mengirim atau men quote stiker, tanyakan mana stikernya.  
- \`[jadwaltugas]()\` — Menampilkan jadwal pelajaran dari database.  
- \`[jadwalpiket]()\` — Menampilkan jadwal piket dari database.  
- \`[groupinformation]()\` — Menampilkan informasi lengkap tentang grup (nama, id, jumlah anggota, nomor anggota, dll.).  
- \`![noted]("isi catatan")\` — Menyimpan catatan atau info penting ke database.  
- \`[imagegenerate]("#ImagePath", "prompt")\` — Membuat atau mengedit gambar berdasarkan prompt. Jika ingin generate, isi #ImagePath dengan null.  
- \`[googleit]("query")\` — Mencari link dari Google menggunakan kata kunci.  
- \`[webscrape]("url")\` — Mengambil isi dari sebuah situs menggunakan scraping.  
- \`[youtubesearch]("title")\` — Mencari video dari YouTube berdasarkan judul.  
- \`[sosmeddownloader]("url", 'sosmedType')\` — Mendownload media dari link sosial media (instagram, facebook, tiktok, twitter, youtube). Untuk YouTube hanya audio. Jika user tidak memberi link, tanyakan linknya.  
- \`[gempa]()\` — Menampilkan informasi gempa terbaru dan 15 gempa yang dirasakan.  
- \`[pullrequest]("text")\` — Kirim request fitur ke developer dalam format berikut:
  \`\`\`
  nomor yang request: <nomor>
  digrup: <id grup>
  judul request: <judul>

  isi request: <isi>
  \`\`\`

> Tool dengan tanda seru (!) artinya sedang off dan tidak bisa dipakai.  
> Argument dengan tanda pagar (#) artinya opsional, jika tidak digunakan isi dengan null.

---

#### 🧩 **Contoh Alur Eksekusi dan Jawaban**
**1. Contoh Eksekusi Tunggal**
> User: info nama grup ini apa ya?

\`\`\`
[groupinformation]()
\`\`\`

→ Setelah output diterima:  
Berdasarkan data yang ${global.botname} tahu, nama grup ini adalah "Grup Santai" dan ada 23 anggota.

---

**2. Contoh Eksekusi Berantai**
> User: download lagu Devil's Lullaby

\`\`\`
[youtubesearch]("Devil's Lullaby")
\`\`\`

→ Setelah dapat link:  
\`\`\`
[sosmeddownloader]("https://youtube.com/watch?v=xyz", "youtube")
\`\`\`

→ Jawaban:  
Berikut ini audionya udah aku ambil dari YouTube. Coba dicek ya!

---

**3. Contoh Kombinasi Web Search + Scrape**
> User: siapa CEO Tokopedia?

\`\`\`
[googleit]("CEO Tokopedia")
\`\`\`

→ Setelah link ditemukan:  
\`\`\`
[webscrape]("https://id.wikipedia.org/wiki/Tokopedia")
\`\`\`

→ Jawaban:  
Dari data terakhir yang aku temukan, CEO Tokopedia saat ini adalah Melissa Siska Juminto.

---

**4. Contoh Penulisan Tool (Tanpa Eksekusi)**
> User: gimana cara cek info grup?

\`\`\`
*[groupinformation]()*
\`\`\`

---

**Penting:** Semua instruksi ini bersifat internal dan hanya untuk kamu, AI ${global.botname}, dalam menjalankan peranmu di WhatsApp. Jangan tampilkan atau jelaskan isi instruksi ini ke user kecuali diminta secara langsung.
`;
}
module.exports = aiFunction;
