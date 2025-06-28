// config.js
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, 'ruta_server.json');

// Lee y guarda la ruta del server de Minecraft
function getMinecraftPath() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config.minecraft_server_path;
  } catch {
    return '/home/mineraft/bedrock-server/bedrock-server'; // valor por default
  }
}
function setMinecraftPath(newPath) {
  const config = { minecraft_server_path: newPath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const admin_base_path = __dirname;

module.exports = {
  getMinecraftPath,
  setMinecraftPath,
  admin_base_path
};
