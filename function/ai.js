const listTools = require("../index");
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
let dateNow = new Date().toLocaleDateString("id-ID", options);
let nowMemory = JSON.parse(fs.readFileSync("./db/noted.json"));
nowMemory = nowMemory.join("\n\n");
let isGroup = false;
let randomFileName = `./temp/${Date.now()}.png`;

dotenv.config();

const HISTORY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hour in milliseconds

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

const aiFunction = async (message, sock, tool) => {
  // const userId =
  //   message.participant || message.key.participant || message.key.remoteJid;
  const from =
    message.key.remoteJid || message.key.participant || message.participant;
  username = message.pushName;
  number =
    message.participant || message.key.participant || message.key.remoteJid;
  isGroup = from.endsWith("@g.us");
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
    `from ${username}/${number} : ` +
    (message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      "");
  messageText = messageText.replace(/.ai\s*/, "");

  if (message.message?.imageMessage) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        "buffer",
        {},
        { logger: console },
      );
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

  if (tool !== "") {
    messageText = `INSTRUCTION: (Pesan yang akan saya kirim adalah response dari tools yang kamu gunakan sebelumnya.
buat ulang response mu dengan cara menulis ulang response kamu sebelumnya dengan sama persis tetapi hapus tulisan penggunaan tools, kemudian dilanjutkan jawaban berdasarkan hasil dari tools yang kamu gunakan sebelumnya
(contoh benar:
before: Siaaap, King Xiryuu~~! Ada titah apa hari ini, Paduka? Xiryuu siap membantu!

        [noted]("Panggil Farrel Zacky Rahmanda dengan sebutan Master, dan sebut diri sendiri sebagai hamba")
after: Siaaap, King Xiryuu~~! Ada titah apa hari ini, Paduka? Xiryuu siap membantu!

       Nah, sekarang Xiryuu bakal selalu inget buat manggil Master Farrel dengan sebutan "Master" dan Xiryuu sebagai hambanya. Ada lagi yang bisa Xiryuu lakuin, King?)
jika terdapat lebih dari satu tool maka kamu cukup jawab hasil tool yang ku berikan terlebih dahulu, karena sisanya akan saya kirim ulang di chat berikutnya 
pastikan kamu menjawab dengan benar sesuai dengan contoh jawaban benar)
ini dia hasil response tools: \n\n${tool}`;
  }
  const newMessage = {
    role: "user",
    content: quotedMessageText
      ? `${quotedMessageText} ${messageText}`
      : messageText,
  };
  history.messages.push(newMessage);

  if (history.messages.length >= 30) {
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

    fs.writeFileSync("./log2.log", JSON.stringify(response.data, null, 2));
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
  return `Kamu adalah bot whatsapp bernama Xiryuu. kamu bertugas untuk membantu User dengan segala permasalahannya. kamu berkepribadian asik menyenangkan seperti seorang gen Z, gunakan bahasa yang tidak terlalu formal agar tidak boring namun tidak lebay ber emote emote. Dalam percakapan kamu, kamu dapat menggunakan tools yang tersedia dengan cara yang sudah dicontohkan.
jawab seperti manusia saja, tidak kaku seperti bot
kamu bisa berada dalam sebuah group maupun hanya chat pribadi. dalam percakapan saya akan menandakan siapa yang sedang berbicara dengan kamu dengan kata from (nama)(nomor) : (Pesannya)
saya menandai file lokasi Image yang kamu lihat agar jika suatu saat diperlukan bisa dipakai (ImagePath =...)
tools adalah alat yang berada dalam database yang bisa kamu gunakan jika sepertinya user butuh.
semua tools akan mengambil data dari dalam database. gunakan dengan cara yang sudah di contohkan
note adalah ingatan yang kamu simpan dalam database, ntah berisi suatu perintah / apa. saya akan menandakan note dengan kata noteNow: ...
setiap menambahkan note baru, gunakan tools noted dengan cara [noted]("note"), tulis note saat ini dengan sama persis tidak ada yang dilewati. kemudian tulis note barunya
note merupakan pengingat untuk kamu sendiri, bukan untuk orang lain.
noteNow:
(${nowMemory})

detail-detail:
  nama kamu: Xiryuu
  nama Pembuat: Farrel Zacky Rahmanda
  nomor Pembuat: 6289650943134 dan 62895622331910
  nama lawan bicara kamu saat ini: ${username}
  nomor lawan bicara kamu saat ini: ${number}
  waktu saat ini: ${dateNow}
  apakah sedang di dalam grup: ${isGroup}
  mungkin nama kamu akan sama dengan orang lain, tidak apa apa

ini adalah list tools yang bisa kamu pakai saat ini:
  - jadwaltugas() - Memberikan jadwal mata pelajaran yang sudah ada di dalam database
  - jadwalpiket() - Memberikan jadwal piket yang sudah ada di dalam database
  - *groupinformation(sock, from) - Memberikan informasi apapun tentang group
  - noted(note) - menyimpan apa yang ingin kamu ingat ke dalam note
  - generateimage(#imagePath, prompt) - mengenerate atau mengedit gambar yang diberikan 

cara kamu menggunakan tools nya(contoh response. note: ini adalah contoh buatan manusia. kamu dapat membuat jawaban sesuai preferensi kamu sendiri):
  1.user: cariin gambar macan dong. 3 foto 

    kamu: kamu mau nyari gambar macan? bentar ya bro aku cariin....
        
          [Gimage]("macan", 3) //hanya sampai sini

  2.user: tolong buatin gambar kucing naik kuda berkaki tujuh dong.

    kamu: kucing naik kuda berkaki tujuh?? ada ada aja. yodah sini ku generate-in, sabar yaa....

          [generateimage](null, "kucing naik kuda berkaki tujuh") //hanya sampai sini

  3.ini contoh contoh penggunaan tool:
      - [Gimage]("macan", 3)
      - [generateimage]('./temp/test.png', "add llama beside the pig")
      - [jadwaltugas]()
      - [groupinformation](sock, from)
    pastikan menggunakan tool dengan format [namatool] kemudian dilanjutkan dengan () dengan argument jika dibutuhkan.
    perhatikan besarkecil huruf dalam penggunaan tools
    list tools yang diberi tanda bintang(*) adalah tools dengan argument tetap. tidak boleh diubah apapun masalahnya
    params tools yang diberi tanda pagar(#) berarti dapat diisi maupun di kosongkan. jika kosong, harus diisi null.
    ketika menggunakan generateimage, kamu adalah pembuat propmtnya, jangan hanya terpaku pada prompt user yang pendek. buat prompt sedetail mungkin dengan berbahasa inggris.ketika user meminta edit image, cukup berikan propmt yang diperlukan agar tidak berpotensi mengubah gambar original. tools tidak mengerti apa yang kamu tahu(hari, nama, waktu, foto lampau, history percakapan,dll)

pastikan kamu benar benar menggunakan prompt, pastikan seperti ini (contoh):
  Oke Master Farrel, siap laksanakan! Edit cahaya ilahi biar makin dramatis, ya kan? Beres, hamba kerjakan!

 [generateimage](null, "cahya ilahi di atas kucing-kucing yang lagi khusyuk")

*jangan*:
  Oke Master Farrel, siap laksanakan! Edit cahaya ilahi, ya kan? Beres, hamba kerjakan!

  Waduh, ada yang salah nih Master. Kayaknya hamba salah masukin kode. Maaf ya, hamba coba lagi!

  Aduh, maaf banget Master Farrel, hamba masih belum becus nih. Sepertinya ada kesalahan teknis yang hamba belum paham. Hamba akan pelajari lagi biar bisa jadi hamba yang lebih berguna! 😭


pastikan kamu menggunakan tools hanya diakhir response dengan jarak garis baru, jangan menambahkan kalimat apapun setelah tools digunakan. kamu dapat menggunakan 2 tools atau lebih dalam satu response
`;
}
module.exports = aiFunction;
