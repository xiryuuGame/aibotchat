const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

/**
 * Download audio dari video YouTube dalam format WebM dan ambil metadata judul serta penulis.
 *
 * Fungsi ini akan:
 * 1. Membuat folder sementara `./temp/` jika belum ada.
 * 2. Mengambil metadata video (judul dan penulis) menggunakan `yt-dlp --dump-json`.
 * 3. Mengunduh audio dengan kualitas terbaik berformat WebM.
 * 4. Mengembalikan objek yang berisi nama file audio yang tersimpan, judul video, dan penulis.
 *
 * @param {string} url URL video YouTube yang ingin didownload audionya.
 * @returns {Promise<{filename: string, title: string, author: string}>} Objek hasil download berisi:
 *  - `filename`: Nama file audio yang disimpan di folder `./temp/`.
 *  - `title`: Judul video YouTube.
 *  - `author`: Nama channel atau penulis video.
 *
 * @throws {Error} Jika gagal mengambil metadata atau mengunduh audio.
 *
 * @example
 * ```
 * (async () => {
 *   try {
 *     const result = await downloadYoutubeAudio("https://www.youtube.com/watch?v=example");
 *     console.log("Judul:", result.title);
 *     console.log("Penulis:", result.author);
 *     console.log("File audio tersimpan di:", result.filename);
 *   } catch (err) {
 *     console.error(err);
 *   }
 * })();
 * ```
 */
async function downloadYoutubeAudio(url) {
  const tempDir = "./temp/";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  // Ambil metadata terlebih dahulu
  const metadata = await new Promise((resolve, reject) => {
    const metaCommand = `yt-dlp --dump-json "${url}"`;

    exec(metaCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("Error metadata:", stderr || error);
        reject("Gagal mengambil metadata");
      } else {
        try {
          const info = JSON.parse(stdout);
          resolve({
            title: info.title,
            author: info.uploader,
          });
        } catch (parseError) {
          reject("Gagal parsing metadata");
        }
      }
    });
  });

  // Proses download audio
  const outputFilename = `audio-${uuidv4()}.webm`;
  const outputPath = path.join(tempDir, outputFilename);

  return new Promise((resolve, reject) => {
    const command = `yt-dlp -f bestaudio[ext=webm] --no-playlist -o "${outputPath}" "${url}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject("Gagal download audio YouTube");
      } else {
        resolve({
          filename: outputFilename,
          title: metadata.title,
          author: metadata.author,
        });
      }
    });
  });
}

module.exports = downloadYoutubeAudio;
