const { twitter, igdl, fbdown, ttdl } = require("btch-downloader");
const youtube = require("./ytdownload.js");
const mediaDownloader = require("./mediadownloader.js");

async function sosmed(url, sosmedType, sock, from) {
  try {
    url = url.replace(/["'`]/g, "");
    sosmedType = sosmedType.replace(/["'`]/g, "");
    let data;
    // Konversi sosmedType ke lower case agar pencocokan tidak sensitif terhadap kapital
    switch (sosmedType.toLowerCase()) {
      case "igdl":
      case "ig":
      case "instagram":
        try {
          data = await igdl(url);
          console.log(data);
          const actualLength = Math.sqrt(data.length); // Kembalikan ke jumlah data asli

          for (let i = 0; i < actualLength; i++) {
            let item = data[i];
            let url = item.url;
            let downloadedMedia = await mediaDownloader(url);

            if (downloadedMedia.endsWith(".png")) {
              await sock.sendMessage(from, {
                image: { url: `./temp/${downloadedMedia}` },
                mimetype: "image/png",
              });
            } else if (downloadedMedia.endsWith(".mp4")) {
              await sock.sendMessage(from, {
                video: { url: `./temp/${downloadedMedia}` },
                mimetype: "video/mp4",
              });
            }
          }
          data = "Berhasil diunduh";
        } catch (err) {
          console.log(err);
          data = "Gagal diunduh";
        }
        break;
      case "ttdl":
      case "tt":
      case "tiktok":
        try {
          data = await ttdl(url);
          console.log(data);
          let caption = `${data.title}\n\naudio: ${data.title_audio}\n\ntiktok foto(ImageSlideshow) saat ini *MASIH BELUM TERSEDIA*`;
          let downloadedMedia = await mediaDownloader(data.video[0]);
          await sock.sendMessage(from, {
            video: { url: `./temp/${downloadedMedia}` },
            mimetype: "video/mp4",
            caption: caption,
          });
          data = "Berhasil diunduh";
        } catch (err) {
          console.log(err);
          data = "Gagal diunduh";
        }
        break;
      case "fbdown":
      case "fb":
      case "facebook":
        try {
          // data = await fbdown(url);
          data = "Masih dalam tahap pengembangan";
        } catch (err) {
          console.log(err);
          data = "Gagal diunduh";
        }
        break;
      case "twitter":
      case "x":
        try {
          // data = await twitter(url);
          data = "Masih dalam tahap pengembangan";
        } catch (err) {
          console.log(err);
          data = "Gagal diunduh";
        }
        break;
      case "youtube":
      case "yt":
        try {
          data = await youtube(url);
          console.log(data.title);
          console.log(data.author);
          console.log(data.filename);

          let caption = `Title: *${data.title}*\n\nAuthor: *${data.author}*\n\n Downloader youtube *HANYA MELAYANI AUDIO*`;
          await sock.sendMessage(from, {
            document: { url: "./temp/" + data.filename },
            mimetype: "audio/mp3",
            fileName: data.title + ".mp3",
          });
          await sock.sendMessage(from, {
            text: caption,
          });

          data = "Berhasil diunduh";
        } catch (err) {
          console.log(err);
          data = "Gagal diunduh";
        }
        break;
      default:
        data = "Jenis sosmed tidak terdaftar.";
    }
    // (Opsional) Gunakan sock atau from untuk memberi notifikasi atau logging
    // Misalnya: sock.sendMessage(from, data);
    return data;
  } catch (err) {
    console.error("Error in sosmed:", err);
    return "Error in sosmed: " + err;
  }
}

// Panggil fungsi secara langsung dengan IIFE
// (async () => {
//   console.log(
//     await sosmed(
//       "https://youtu.be/rIhfB2SUvk4?si=d-bZpbks-mI6HDMK",
//       "youtube",
//       null,
//       null,
//     ),
//   );
// })();

module.exports = sosmed;
