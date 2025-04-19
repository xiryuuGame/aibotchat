function jadwalmapel() {
  return JSON.stringify(
    {
      Senin: ["TLJ-PKK", "B.INGGRIS", "ASJ"],
      Selasa: ["RPL", "PAI", "PJOK", "MTK"],
      Rabu: ["AIJ", "B-INGGRIS", "RPL", "TLJ-PKK"],
      Kamis: ["PKN", "AIJ", "mandarin", "SEJARAH"],
      Jumat: ["B-INDO", "WAN"],
    },
    null,
    2,
  );
}

module.exports = jadwalmapel;
