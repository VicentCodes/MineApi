const path = require('path');
const fs   = require('fs');

const CONFIG_PATH = path.join(__dirname, 'ruta_server.json');
const admin_base_path = __dirname;

function _readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function _writeConfig(config) {
  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify(config, null, 2) + '\n'
  );
}

// Inicializa y persiste api_server_path si no existe
(function ensureApiPath() {
  const cfg = _readConfig();
  if (!cfg.api_server_path) {
    cfg.api_server_path = admin_base_path;
    _writeConfig(cfg);
  }
})();

// Obtiene la ruta del servidor de Minecraft
function getMinecraftPath() {
  const cfg = _readConfig();
  return cfg.minecraft_server_path || '/home/minecraft/bedrock-server';
}

// Actualiza la ruta del servidor de Minecraft en el JSON
function setMinecraftPath(newPath) {
  const cfg = _readConfig();
  cfg.minecraft_server_path = newPath;
  _writeConfig(cfg);
}

// Obtiene la ruta del servidor API (inicializada a admin_base_path si faltaba)
function getApiPath() {
  const cfg = _readConfig();
  // retrocede dos niveles desde admin_base_path
    if (!cfg.api_server_path) {
    cfg.api_server_path = path.join(admin_base_path, '..', '..');
    _writeConfig(cfg);
    }
    console.log(`Ruta del servidor API: ${cfg.api_server_path}`);
  return cfg.api_server_path;

}

// Actualiza la ruta del servidor API en el JSON
function setApiPath(newPath) {
  const cfg = _readConfig();
  cfg.api_server_path = newPath;
  _writeConfig(cfg);
}

module.exports = {
  getMinecraftPath,
  setMinecraftPath,
  getApiPath,
  setApiPath,
  admin_base_path
};
