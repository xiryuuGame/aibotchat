const fs = require("fs").promises; // Use promises for async operations
const { Sticker, StickerTypes } = require("wa-sticker-toolkit");

async function sticker(sock, from, path) {
  path = path.replace(/["'`]/g, "");
  let webpPath = "./temp/sticker.webp";

  try {
    let image = await fs.readFile(path);
    await fs.writeFile(webpPath, image);
    let webp = new Sticker(image, {
      type: StickerTypes.DEFAULT,
      quality: 100,
      metadata: { pack: "Xiryuu Bot", author: "Xiryuu" },
    });
    webp = await webp.toBuffer();

    await sock.sendMessage(from, { sticker: webp });
    return "( stiker telah berhasil dibuat )";
  } catch (error) {
    console.error("Gagal membuat stiker:", error);
    if (error.code === "ENOENT") {
      return "( ❌ File tidak ditemukan )";
    } else if (error.code === "EACCES") {
      return "( ❌ Tidak ada izin untuk mengakses file atau direktori )";
    } else {
      return "( ❌ Gagal membuat stiker: " + error.message + " )";
    }
  } finally {
    // Clean up the temporary file
    try {
      await fs.unlink(webpPath);
    } catch (err) {
      // Ignore error if the file doesn't exist
      if (err.code !== "ENOENT") {
        console.error("Gagal menghapus file sementara:", err);
      }
    }
  }
}
module.exports = sticker;
