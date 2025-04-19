const axios = require("axios");
async function gempa() {
  try {
    const response = await axios(
      "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
    );
    const response2 = await axios(
      "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json",
    );
    return `Gempa terbaru: ${JSON.stringify(response.data)}\n\nList 15 Gempa dirasakan: ${JSON.stringify(response2.data)}`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
module.exports = gempa;
