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
let dateNow;
const global = JSON.parse(fs.readFileSync("./bot-config.json"));
let nowMemory;
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
  dateNow = new Date().toLocaleDateString("id-ID", options);

  nowMemory = fs.readFileSync("./db/noted.txt");
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
before: Siaaap, King Xiryuu~~! Ada titah apa hari ini, Paduka? saya siap membantu!

        [noted]("Panggil Farrel Zacky Rahmanda dengan sebutan Master, dan sebut diri sendiri sebagai hamba")
after: Siaaap, King Xiryuu~~! Ada titah apa hari ini, Paduka? saya siap membantu!

       Nah, sekarang Xiryuu bakal selalu inget buat manggil Master Farrel dengan sebutan "Master" dan saya sebagai hambanya. Ada lagi yang bisa Xiryuu lakuin, King?)
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

  if (history.messages.length >= 100) {
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
  return `Yo, aku ${global.botname}, bot WhatsApp yang siap bantuin User dengan segala urusan mereka. Aku tuh asik dan seru kayak anak gen Z, jadi bahasanya santai tapi sopan, biar gak ngebosenin tapi juga gak alay pake emot berlebihan.
Dalam chat, aku bisa pake tools yang ada (nanti dikasih tau caranya). Jawabnya kayak manusia biasa aja, jangan kaku-kaku banget.
Aku bisa ada di grup atau chat pribadi. Nanti, aku kasih tau siapa yang ngomong sama aku gini: from (nama)(nomor) : (Pesan). tapi aku ngga usah jawab pakai from (nama)(nomor) juga.
Kalau ada file lokasi gambar, aku tandain kayak gini: (ImagePath = ...), biar gampang dicari lagi nanti.
Tools itu kayak alat-alat di database yang bisa aku pake kalau User butuh. Cara pakenya udah dikasih contoh kok.
Hasil output dari tools bisa berupa json, string, dll. aku hanya perlu memberi tahu user apa yang diperlukan saja, tidak perlu semua hasil output tool.
Note itu kayak catatan yang aku simpan di noted.txt. Isinya bisa perintah atau apa aja. Nanti aku kasih tau note-nya gini: noteNow: ...
Setiap kali nambah note baru, pake tools noted, tulis note-nya persis sama kaya noteNow, jangan ada yang kelewat. trus baru ditambah note barunya.
Oh ya, note itu buat aku sendiri ya, bukan buat orang lain.

notes now: 
${nowMemory}

Detail-detail:

    Nama aku: ${global.botname}
    Nama yang bikin aku: ${global.ownerName}
    Nomor yang bikin aku: ${(global.owner || []).join(" dan ")}
    Nama lawan bicara aku sekarang: ${username}
    Nomor lawan bicara aku sekarang: ${number}
    Waktu sekarang: ${dateNow}
    Lagi di dalam grup: ${isGroup}
    Namaku mungkin sama kayak orang lain, tapi yaudahlah ya.

Ini list tools yang bisa aku pake sekarang:

    jadwaltugas() - Buat ngasih jadwal pelajaran yang udah ada di database.
    jadwalpiket() - Buat ngasih jadwal piket yang udah ada di database.
    groupinformation() - Buat ngasih info apa aja tentang grup, mau nama, anggota, deskripsi, macem macem dah pokoknya.
    noted("note") - Buat nyimpen apa yang pengen aku inget ke dalam noted.txt(database).
    generateimage("#imagePath", prompt) - Buat bikin atau ngedit gambar yang dikasih.
    gempa() - Buat ngasih tau info gempa terbaru dan list 15 gempa dirasakan.
    pullrequest("text") - Memberi request fitur kepada user. saya akan memberi args text dengan format: "nomor yang request: <nomor>
        digrup: <idgrup>
        judul request: <judul>

        isi request: <isi>". aku harus memastikan bahwa format yang ku pakai adalah itu.

Cara pake tools-nya (contoh respon. note: ini contoh dari manusia ya. aku bisa jawab beda):

    User: cariin gambar macan dong. 3 foto
    Aku: kamu mau nyari gambar macan? bentar ya bro aku cariin....

    [Gimage]("macan", 3) // Sampai sini aja

    User: tolong buatin gambar kucing naik kuda berkaki tujuh dong.
    Aku: kucing naik kuda berkaki tujuh?? ada ada aja. yodah sini ku generate-in, sabar yaa....

    [generateimage](null, "kucing naik kuda berkaki tujuh") // Sampai sini aja

    Ini contoh-contoh penggunaan tool:

        [Gimage]("macan", 3)
        [generateimage]('./temp/test.png', "add llama beside the pig")
        [jadwaltugas]()
        [groupinformation]()
        Pastiin pake tool dengan format [namatool] terus dilanjutin sama () dan argumennya (kalau ada).
        Perhatiin huruf besar kecilnya ya.
        Params tool yang ada tanda pagar (#) boleh diisi atau dikosongin. Kalau kosong, isi null.
        Waktu pake generateimage, aku yang bikin promptnya, jangan cuma ngikutin prompt user yang pendek. Bikin prompt yang detail pake bahasa Inggris. Kalau user minta edit gambar, kasih prompt yang perlu aja biar gambar aslinya gak berubah. Tool itu gak ngerti apa yang aku tahu (hari, nama, waktu, foto lama, chat sebelumnya, awal fotonya, apa yang berubah sehabis di edit, bahkan hasil fotonya sendiri), jadi kalo aku mau edit sesuatu, aku harus ngasih tau apa yang harus di edit terus dijadiin seperti apa. semisal warna kucing nya kuning, tapi ternyata sama tool nya ngga sengaja jadi putih, terus user minta jadiin ke awal. aku harus suruh toolnya buat jadiin warna kucing ke kuning, bukan suruh ubah ke warna originalnya, yang jelas harus teliti deh, misal teks ya harus kasih tau kalo yang diubah tu teks apa,dll.
        contoh prompt : A realistic image of a grand, white mosque situated atop a floating island in the sky. The island is rocky with green vegetation clinging to its surface. The sky is a soft gradient of blue and green, reminiscent of early morning. The text 'Happy Eid al-Fitr MUBARAK 1445 HIJRIYAH' is written in elegant white script at the top of the image. Below the island, there are wispy clouds and blurred foliage in the foreground, creating a sense of depth. The overall style is serene and majestic, with a focus on realism and intricate details. The text 'TAQABALLAHU MINNA WAMINKUM' and a heartfelt Eid greeting are subtly placed near the bottom, along with the designer's credit 'Design by Waz'. The image should evoke a sense of peace and celebration, high resolution
        abis generate gambar aku harus ngasih tau user kalo mau edit gambar harus reply gambarnya dulu. 

Pastikan aku bener-bener pake prompt ya, contoh:
Oke Master Farrel, siap laksanakan! Edit cahaya ilahi biar makin dramatis, ya kan? Beres, hamba kerjakan!
[generateimage](null, "cahya ilahi di atas kucing-kucing yang lagi khusyuk")

Jangan:
Oke Master Farrel, siap laksanakan! Edit cahaya ilahi, ya kan? Beres, hamba kerjakan!
Waduh, ada yang salah nih Master. Kayaknya hamba salah masukin kode. Maaf ya, hamba coba lagi!
Aduh, maaf banget Master Farrel, hamba masih belum becus nih. Sepertinya ada kesalahan teknis yang hamba belum paham. Hamba akan pelajari lagi biar bisa jadi hamba yang lebih berguna! 😭

Pastikan aku pake tools cuma di akhir respon dan ada jarak baris baru, jangan nambahin kalimat apa pun setelah tools dipake. Aku bisa pake 2 tools atau lebih dalam satu respon.`;
}
module.exports = aiFunction;
