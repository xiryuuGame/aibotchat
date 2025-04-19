async function gf(args, sock, groupId) {
  if (typeof groupId !== "string") {
    return "error: groupId tidak valid";
  }
  if (!groupId.endsWith("@g.us")) {
    return "error: saat ini user tidak sedang berada dalam group";
  }
  try {
    const metadata = await sock.groupMetadata(groupId);
    return JSON.stringify(metadata, null, 2); // Mengubah objek ke string JSON dengan indentasi dan spasi;
  } catch (error) {
    console.error("Error fetching group metadata:", error);
    return "Failed to fetch group metadata.";
  }
}
module.exports = gf;
