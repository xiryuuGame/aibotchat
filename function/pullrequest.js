function req(text, sock, m) {
  try {
    sock.sendMessage(
      "6289650943134@s.whatsapp.net",
      { text: text },
      { quotedMessage: m },
    );
    return "( pesan request berhasil dikirim )";
  } catch (error) {
    return `(error: ${error.message})`;
  }
}
module.exports = req;
