#!/bin/bash

# Deteksi sistem operasi
OS=$(uname -s)

# Fungsi untuk warna
set_colors() {
  if command -v tput &>/dev/null && [[ "$OS" != "MINGW"* && "$OS" != "Windows_NT" ]]; then
    # tput tersedia dan bukan Windows
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    NC=$(tput sgr0)
  else
    # tput tidak tersedia atau Windows, nonaktifkan warna
    RED=""
    GREEN=""
    YELLOW=""
    NC=""
  fi
}

# Inisialisasi warna
set_colors

# Fungsi animasi loading
loading() {
  local i=0
  while [ $i -lt 3 ]; do
    echo -ne "${YELLOW}. "
    sleep 0.5
    i=$((i + 1))
  done
  echo -ne "${NC}\n"
}

# Instalasi npm
echo "${GREEN}Memulai instalasi NPM...${NC}"
npm install
npm update
echo "${GREEN}Instalasi NPM selesai.${NC}"

# Membuat folder temp
echo "${GREEN}Membuat folder temp...${NC}"
mkdir -p temp
echo "${GREEN}Folder temp telah dibuat.${NC}"

# Membuat file .env
echo "${GREEN}Membuat file .env...${NC}"
if [ -f .env ]; then
  echo "${YELLOW}.env sudah ada.${NC}"
else
  echo "Masukkan GEMINI_API_KEY Anda:"
  read GEMINI_API_KEY
  echo "GEMINI_API_KEY=$GEMINI_API_KEY" >.env
  echo "${GREEN}File .env telah dibuat.${NC}"
fi

# Membuat folder db
echo "${GREEN}Membuat folder db...${NC}"
mkdir -p db
echo "${GREEN}Folder db telah dibuat.${NC}"

# Membuat file user.json
echo "${GREEN}Membuat file user.json...${NC}"
if [ -f db/user.json ]; then
  echo "${YELLOW}user.json sudah ada.${NC}"
else
  touch db/user.json
  echo "${GREEN}File user.json telah dibuat.${NC}"
fi

# Membuat file noted.json
echo "${GREEN}Membuat file noted.json...${NC}"
if [ -f db/noted.json ]; then
  echo "${YELLOW}noted.json sudah ada.${NC}"
else
  touch db/noted.json
  echo "${GREEN}File noted.json telah dibuat.${NC}"
fi

# Instalasi PM2 (opsional)
read -p "Apakah Anda ingin menginstal PM2? (y/n): " INSTALL_PM2

if [[ -z "$INSTALL_PM2" || "$INSTALL_PM2" == "y" ]]; then
  echo "${GREEN}Menginstal PM2...${NC}"
  if ! npm install -g pm2; then
    if [[ "$OS" == "Linux" || "$OS" == "Darwin" ]]; then
      echo "${YELLOW}Instalasi PM2 gagal. Mencoba dengan sudo...${NC}"
      if ! sudo npm install -g pm2; then
        echo "${RED}Gagal menginstal PM2 bahkan dengan sudo. Pastikan npm dan sudo terinstal dengan benar.${NC}"
      else
        echo "${GREEN}PM2 berhasil diinstal dengan sudo.${NC}"
      fi
    else
      echo "${RED}Instalasi PM2 gagal. Pastikan npm terinstal dengan benar dan Anda memiliki hak akses yang cukup.${NC}"
    fi
  else
    echo "${GREEN}PM2 berhasil diinstal.${NC}"
  fi
  echo "${GREEN}PM2 telah diinstal.${NC}"

  # Setup ecosystem.config.js
  echo "${GREEN}Membuat ecosystem.config.js...${NC}"
  cat <<EOF >ecosystem.config.js
module.exports = {
  apps: [{
    name: 'aibotchat',
    script: 'npm start',
    watch: true,
    ignore_watch: ['node_modules', 'temp', '.env', 'AIHistory', 'session', '*.log'],
  }],
};
EOF
  echo "${GREEN}ecosystem.config.js telah dibuat.${NC}"

  echo "Untuk menjalankan bot dengan PM2:"
  echo "  npm run startpm2"
  echo "Untuk melihat log PM2:"
  echo "  pm2 logs aibotchat"
else
  echo "${YELLOW}PM2 tidak diinstal.${NC}"
  echo "Untuk menjalankan bot:"
  echo "  npm start"
fi

echo "${GREEN}Instalasi selesai!${NC}"
