// src/config/config.js
const path = require('path');
const fs   = require('fs');

const CONFIG_PATH = path.join(__dirname, 'ruta_server.json');

// Lee y guarda la ruta del server de Minecraft
function getMinecraftPath() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return config.minecraft_server_path;
  } catch {
    // valor por defecto si no existe o falla la lectura
    return '/home/mineraft/bedrock-server';
  }
}
function setMinecraftPath(newPath) {
  const config = { minecraft_server_path: newPath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// admin_base_path seguirá apuntando al root del proyecto
const admin_base_path = __dirname;

module.exports = {
  getMinecraftPath,
  setMinecraftPath,
  admin_base_path
};
