const fs = require("fs");
async function noted(note) {
  try {
    fs.writeFileSync("./db/noted.txt", note);
    return "( note berhasil disimpan )";
  } catch (error) {
    console.error("Error saving note:", error);
    return "( Gagal menyimpan catatan )"; // Or handle the error as needed
  }
}
module.exports = noted;
