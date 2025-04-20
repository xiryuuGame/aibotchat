# 🤖 AIBOTCHAT

Sebuah bot WhatsApp yang ditenagai oleh kecerdasan buatan (AI), dirancang untuk percakapan cerdas dan pemanfaatan berbagai alat.

## ✨ Kreator & Kontak ✨

| Platform  | Tautan                                                            | Hubungi Saya!            |
| :-------- | :---------------------------------------------------------------- | :----------------------- |
| GitHub    | [xiryuuGame](https://www.github.com/xiryuuGame)                   | Jelajahi proyek saya!    |
| Instagram | [xiryu_05](https://www.instagram.com/xiryu_05/)                   | Intip visual saya!       |
| Threads   | [xiryu_05](https://www.threads.net/@xiryu_05)                     | Mari mengobrol!          |
| Email     | [farrel.z.rahmanda@gmail.com](mailto:farrel.z.rahmanda@gmail.com) | Untuk pertanyaan serius. |

---

## ⚙️ Fitur

Bot ini menawarkan berbagai fitur bermanfaat:

- **Manajemen Jadwal:**
  - `jadwal mata pelajaran`: Menyediakan akses ke jadwal pelajaran.
  - `jadwal piket`: Menampilkan daftar piket.
  - `jadwal tugas`: Menampilkan daftar tugas.
- **Informasi:**
  - `group info`: Mengambil dan membagikan detail grup.
  - `info Gempa`: Mengambil dan membagikan informasi gempa terkini.
  - `youtube search`: Mengambil dan membagikan informasi video dari youtube.
  - `google search`: Mengambil dan membagikan informasi data dari google.
- **Pembuatan Konten:**
  - `image generator`: Membuat gambar berdasarkan perintah teks.
  - `sticker`: Membuat stiker dari gambar atau teks.
  - `sticker to image`: Membuat stiker menjadi foto kembali.
- **Utilitas**
  - `Sosmed downloader`: Mendownload video, foto, atau audio dari berbagai sosmed seperti youtube, instagram, tiktok, facebook, dll.
  - `web scraping`: Mengambil data teks dari dalam suatu web.
- **Pencatatan:**(**sedang dimatikan**)
  - `note`: Menyimpan catatan untuk AI. \* `noted list`: Menampilkan daftar catatan yang telah disimpan.
  - `delete note`: Menghapus catatan berdasarkan indeks.

## 🔑 Variabel Lingkungan

Untuk menjalankan proyek ini, Anda perlu mengatur variabel lingkungan berikut dalam file `.env` Anda:

- `GEMINI_API_KEY`: Kunci API Anda untuk layanan Gemini AI.

## 🛠️ Instalasi

1. **Klon repositori:**

   ```bash
   git clone [https://github.com/xiryuuGame/aibotchat](https://github.com/xiryuuGame/aibotchat)
   cd aibotchat/
   ```

2. **Jalankan skrip instalasi:**

   ```bash
   ./install.sh
   ```

   Skrip ini akan menangani pengaturan yang diperlukan. Pastikan Anda memiliki izin yang benar untuk menjalankan skrip. Jika Anda mengalami masalah izin, berikan izin eksekusi:

   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Konfigurasi Bot:**

   Ubah file `bot-config.json`:

   ```json
   {
     "botname": "NAMA BOT ANDA",
     "number": "NOMOR BOT ANDA",
     "owner": ["NOMOR PEMILIK 1", "NOMOR PEMILIK 2"],
     "ownerName": "NAMA ANDA"
   }
   ```

## 🚀 Cara Penggunaan

Bot ini dapat digunakan dalam obrolan grup dan obrolan pribadi di WhatsApp. Berikut cara mengaktifkan dan menggunakannya:

1. **Aktivasi/Deaktivasi AI:**

   - Untuk **mengaktifkan** fungsionalitas AI dalam obrolan, kirim pesan: `.toggle`
   - Untuk **menonaktifkan** fungsionalitas AI, kirim pesan: `.toggle` lagi.

2. **Manajemen ID Pengguna:**

   - Saat Anda menggunakan `.toggle` untuk pertama kali, ID pengguna/grup WhatsApp Anda akan ditambahkan ke file bernama `list.json`. File ini mencatat pengguna yang telah mengaktifkan AI.
   - Bot hanya akan menanggapi perintah AI dari pengguna/grup yang ID-nya ada di `list.json` dan ketika AI aktif (diaktifkan).

3. **Menggunakan Fitur AI:**

   - Setelah AI diaktifkan (dan ID Anda ada di `list.json`), Anda dapat menggunakan fitur-fitur yang tercantum di atas dengan mengirimkan perintah yang sesuai. Contoh:
     - `jadwal mata pelajaran`
     - `jadwal piket`
     - `jadwal tugas`
     - `group info`
     - `info Gempa`
     - `image generator <perintah Anda>` (misalnya, `image generator seekor kucing bermain piano`)
     - `sticker <balas gambar atau kirim teks>` (misalnya, balas gambar dengan `.sticker` atau kirim `.sticker teks`)
     - `note <catatan Anda>` (misalnya, `note Ingat beli bahan makanan`)
     - `noted list`
     - `delete note <indeks catatan>` (misalnya, `delete note 1` untuk menghapus catatan pertama)

4. **Reset History tempat anda berbicara:**

   - Untuk **Mereset** History AI dalam obrolan, kirim pesan: `.reset`

## 🤝 Kontribusi

Kami menyambut kontribusi Anda! Berikut cara Anda dapat terlibat:

1. **Fork repositori ini.**
2. **Buat branch baru** untuk perubahan Anda: `git checkout -b fitur-baru`.
3. **Lakukan perubahan** dan commit: `git commit -am 'Menambahkan fitur baru'`.
4. **Push perubahan** ke fork Anda: `git push origin fitur-baru`.
5. **Buat pull request** di GitHub untuk mengusulkan perubahan Anda.

Pastikan kode Anda sesuai dengan gaya yang ada dan menyertakan pengujian yang relevan untuk menjaga kualitas kode.
