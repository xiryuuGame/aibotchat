const { search } = require("google-sr");
async function google(query) {
  try {
    query = query.replace(/["'`]/g, "");
    let response = await search({ query: query });

    return JSON.stringify(response, null, 2);
  } catch (err) {
    console.log(err);
    return "( Gagal mencari: )" + err.message;
  }
}
module.exports = google;
