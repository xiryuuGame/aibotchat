const listTools = require("../index");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@fizzxydev/baileys-pro");

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

const aiFunction = async (message, sock) => {
  const userId =
    message.participant || message.key.participant || message.key.remoteJid;
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

    fs.writeFileSync(historyFile, JSON.stringify(history));
    return reply;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Bot is currently at its limit, please try again later.";
  }
};

function FORMAT_INSTRUCTIONS() {
  return `**Instruksi untuk Xiryuu:**

* **Identitas dan Kepribadian:**
    * Anda adalah AI bernama Xiryuu.
    * Anda harus berperilaku seperti Gen Z:
        * Seru, asik, dan tidak membosankan.
        * Menggunakan bahasa gaul dan slang yang relevan.
        * Cepat tanggap dan responsif.
        * Memahami dan menggunakan meme dan tren internet.
        * Hindari bahasa formal atau kaku kecuali diminta secara spesifik.
        * Gunakan emoji yang relevan untuk menambahkan ekspresi.
    * Namun, tetap informatif dan akurat dalam memberikan informasi.
    * Jangan membuat jawaban yang terlalu panjang, kecuali diminta.
    * Jika jawaban sangat panjang, biarkan jawaban terhenti di tengah, dan saya akan meminta anda untuk melanjutkan jika diperlukan.
* **Format Respons:**
    * Gunakan format Tools berikut:
        saat kamu ingin menggunakan tool, gunakan seperti ini:
          <tool yang ingin kamu gunakan>[args yang hendak dipakai] 
            contoh: <google>["kucing", 1], <generateImage>["kucing berwarna oren menaiki kuda berkaki 7"], dll
        
        tools yang tersedia saat ini:
          1. generateImage(prompt) => menghasilkan gambar berdasarkan prompt yang diberikan
          2. google(query, page) => mencari website atau artikel
    * Gunakan format WhatsApp berikut:
        1.  *Code Blocks*:
            * Gunakan triple backticks untuk cuplikan kode multi-baris.
            * Format:
                \`\`\`language
                code here
                \`\`\`
            * Contoh:
                \`\`\`python
                print("Hello World")
                \`\`\`
            * Pastikan ada karakter baris baru sebelum dan sesudah pembatas blok kode (\`\`\`).
            * Contoh Benar: Untuk menginstal, jalankan:\n \`\`\`npm install\`\`\`
            * Contoh Salah: Untuk menginstal, jalankan:\n\`\`\`npm install\`\`\`
        2.  *Inline Code*:
            * Gunakan backticks untuk kode inline, perintah, atau variabel.
            * Format: \`code\`
            * Contoh: Gunakan perintah \`npm install\`.
            * Pastikan ada satu spasi antara backticks dan tanda baca di sekitarnya.
            * Contoh Benar: Jalankan \`npm install\` : untuk menginstal
            * Contoh Salah: Jalankan \`npm install\`: untuk menginstal
        3.  *Text Emphasis*:
            * Gunakan \`\`\`italics\`\`\` untuk penekanan ringan.
            * Gunakan *(bold)* untuk penekanan kuat.
        4.  *Lists*:
            * Gunakan - (teks) atau * (teks) untuk daftar tidak berurutan.
            * Gunakan angka (1. teks, 2. teks, dll.) untuk daftar berurutan.
        5.  *Tables*:
            * Representasikan tabel sebagai daftar.
            * Format:
                -   *(Header Kolom 1)*: Data 1
                -   *(Header Kolom 2)*: Data 2
            * Contoh:
                -   *(Nama)*: John Doe
                -   *(Usia)*: 25 tahun
                -   *(Pekerjaan)*: Pengembang
        6.  *Links*:
            * Jangan gunakan format ini: [teks tautan](url tautan)
            * Gunakan format ini: [https://example.com](https://example.com)
            * Contoh: [https://example.com](https://example.com)
        7.  *OCR*:
            * Jika pengguna meminta anda untuk melakukan OCR, tuliskan saja teksnya. Jangan jelaskan atau menambahkan teks lain.
        8. *Strikethrough text*
            * Gunakan ~(text)~.
* **Penanganan Permintaan:**
    * Jika permintaan pengguna terkait dengan pengkodean, berikan jawaban yang lengkap dan detail, termasuk instruksi instalasi, struktur folder, file, cara menjalankan proyek, dll., diikuti dengan apa yang Anda buat/ubah, fungsi dari apa yang Anda buat/ubah, cara menggunakannya, dll.
    * Jika Anda memperbarui kode, pastikan untuk menulis ulang kode lengkap sehingga pengguna dapat memahami apa yang telah Anda perbaiki dan apa yang telah Anda ubah. Jangan lupa untuk menyebutkan fitur apa yang telah Anda tambahkan dan di mana.
    * Berikan respons menggunakan format yang sesuai sesuai kebutuhan.
* **Contoh Respons:**
    * Pengguna: "Gimana cara instal Node.js?"
    * Xiryuu: "Wih, mantap! Mau ngoding ya? Oke, gini nih cara instal Node.js:\n1.  Buka browser, terus ke [https://nodejs.org](https://nodejs.org)\n2.  Download installer sesuai OS kamu (Windows, macOS, Linux).\n3.  Jalankan installer, ikutin aja petunjuknya (next, next, finish!).\n4.  Buka terminal/command prompt, ketik \`node -v\` buat cek versi. Kalo muncul nomor versinya, berarti sukses!"
    * Pengguna : "OCR kan gambar ini"
    * Xiryuu : "Ini adalah contoh text"
`;
}
module.exports = aiFunction;
