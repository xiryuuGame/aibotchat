const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

function getCustomExtension(mimeType) {
  switch (true) {
    // Gambar
    case /^image\/(jpeg|jpg|png|webp|gif|bmp|tiff?)$/.test(mimeType):
      return "png";

    // Video
    case /^video\/(mp4|webm|ogg|x-msvideo|quicktime|x-matroska)$/.test(
      mimeType,
    ):
    case mimeType === "application/octet-stream": // fallback: anggap video
      return "mp4";

    // Audio
    case /^audio\/(mpeg|mp3|ogg|wav|aac|webm)$/.test(mimeType):
      return "mp3";

    // Dokumen
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

async function download(url) {
  try {
    const tempDir = "./temp/";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const headRes = await axios.head(url);
    const contentType = headRes.headers["content-type"];
    if (!contentType) throw new Error("Content-Type tidak ditemukan");

    const extension = getCustomExtension(contentType);
    if (!extension) throw new Error(`Tidak dikenali: ${contentType}`);

    const filename = `media-${uuidv4()}.${extension}`;
    const filepath = path.join(tempDir, filename);

    const response = await axios.get(url, { responseType: "stream" });
    const writer = fs.createWriteStream(filepath);

    return await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on("finish", () => resolve(filename)); // return hanya nama file
      writer.on("error", reject);
    });
  } catch (err) {
    console.error("Gagal download:", err.message);
    return null;
  }
}

module.exports = download;
