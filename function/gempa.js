const axios = require("axios");
async function gempa() {
  const response = await axios(
    "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
  ).then((s) => s.data);
  const response2 = await axios(
    "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
  ).then((s) => s.data);
  return `Gempa terbaru: ${JSON.stringify(response)}\n\nList 15 Gempa dirasakan: ${JSON.stringify(response2)}`;
}
module.exports = gempa;
