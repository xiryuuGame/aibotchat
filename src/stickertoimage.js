const { downloadMediaMessage } = require("@fizzxydev/baileys-pro");
const fs = require("fs");
async function sImage(key, sock, from) {
  try {
  } catch (err) {
    console.error(err);
    return `( Gagal menconvert stiker: ${err.message})`;
  }
  key = key.replace(/["'`]/g, "");
  let m = JSON.parse(fs.readFileSync(`./chatHistory/${from}.json`));
  m = m.find((msg) => msg.key.id === key);

  if (!m) {
    console.log("Key tidak ditemukan.");
    return;
  }
  console.log("Match ditemukan:", m);

  const downloadedMedia = await downloadMediaMessage(m, "buffer");
  let randomFileName = `./temp/${Date.now()}.png`;
  fs.writeFileSync(randomFileName, downloadedMedia);
  await sock.sendMessage(from, {
    image: { url: randomFileName },
    mimetype: "image/png",
  });
  return "( stiker telah berhasil di convert dan telah berhasil dikirim ke user )";
}
module.exports = sImage;
