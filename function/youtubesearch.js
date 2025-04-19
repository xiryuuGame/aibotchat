const yts = require("yt-search");
async function ytse(title) {
  try {
    title = title.replace(/["'`]/g, "");
    const data = await yts(title);
    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.log(err);
    return "( Gagal mencari ): " + err.messages;
  }
}

module.exports = ytse;
