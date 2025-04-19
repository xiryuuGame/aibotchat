const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeTextOnly(url) {
  try {
    url = url.replace(/["'`]/g, "");
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Mengambil semua teks dari elemen body
    const text = $("body").text();

    // Membersihkan teks (hapus whitespace berlebih)
    const cleanedText = text.replace(/\s+/g, " ").trim();

    return cleanedText;
  } catch (err) {
    console.log(err);
    return "( Gagal menscrape: ) " + err.message;
  }
}

module.exports = scrapeTextOnly;
