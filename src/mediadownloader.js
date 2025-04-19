const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

function getCustomExtension(mimeType) {
  switch (true) {
    case /^image\/(jpeg|jpg|png|webp|gif|bmp|tiff?)$/.test(mimeType):
      return "png";
    case /^video\/(mp4|webm|ogg|x-msvideo|quicktime|x-matroska)$/.test(
      mimeType,
    ):
    case mimeType === "application/octet-stream":
      return "mp4";
    case /^audio\/(mpeg|mp3|ogg|wav|aac|webm)$/.test(mimeType):
      return "mp3";
    case mimeType === "application/pdf":
      return "pdf";
    case mimeType === "application/zip":
      return "zip";
    case mimeType === "text/plain":
      return "txt";
    case mimeType === "application/json":
      return "json";
    default:
      return null;
  }
}

const fakeHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.google.com",
  Connection: "keep-alive",
  DNT: "1", // Do Not Track
};

async function download(url) {
  try {
    const tempDir = "./temp/";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const response = await axios.get(url, {
      responseType: "stream",
      headers: fakeHeaders,
      maxRedirects: 5,
      timeout: 10000,
    });

    const contentType = response.headers["content-type"];
    console.log(contentType);
    if (!contentType) {
      console.warn("Tidak bisa mendeteksi Content-Type, fallback ke .bin");
      extension = "bin";
    }

    const extension = getCustomExtension(contentType);
    if (!extension) throw new Error(`Tidak dikenali: ${contentType}`);

    const filename = `media-${uuidv4()}.${extension}`;
    const filepath = path.join(tempDir, filename);

    // const response = await axios.get(url, {
    //   responseType: "stream",
    //   headers: fakeHeaders,
    //   maxRedirects: 5,
    //   timeout: 10000, // 10 detik
    // });

    const writer = fs.createWriteStream(filepath);

    return await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", () => {
        console.log("Berhasil diunduh:", filename);
        resolve(filename);
      });
      writer.on("error", reject);
    });
  } catch (err) {
    console.error("Gagal download:", err);
    return null;
  }
}

module.exports = download;
