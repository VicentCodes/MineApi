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

// Obtiene la ruta del servidor API SIN retroceder dos niveles
function getApiPath() {
  const cfg = _readConfig();
  return cfg.api_server_path || admin_base_path;
}

// Actualiza la ruta del servidor API en el JSON, creando el directorio si hace falta
function setApiPath(newPath) {
  const cfg = _readConfig();
  cfg.api_server_path = path.resolve(newPath);
  _writeConfig(cfg);

  if (!fs.existsSync(cfg.api_server_path)) {
    fs.mkdirSync(cfg.api_server_path, { recursive: true });
  }

  return cfg.api_server_path;
}

module.exports = {
  getMinecraftPath,
  setMinecraftPath,
  getApiPath,
  setApiPath,
  admin_base_path
};
