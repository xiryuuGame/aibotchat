const fs = require("fs");
async function noted(note) {
  try {
    let data = [note];
    fs.writeFileSync("./db/noted.json", JSON.stringify(data, null, 2));
    return "( note berhasil disimpan )";
  } catch (error) {
    console.error("Error saving note:", error);
    return "( Gagal menyimpan catatan )"; // Or handle the error as needed
  }
}
module.exports = noted;
