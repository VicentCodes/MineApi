// config/config.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const CONFIG_DIR = path.join(__dirname);
const CONFIG_PATH = path.join(CONFIG_DIR, "server.yml");
const admin_base_path = __dirname;

// Asegura que exista el directorio y el archivo YAML
function _ensureConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      paths: {
        api_server: admin_base_path,
        minecraft_server: "/home/minecraft/bedrock-server",
      },
      mensajes: {
        bienvenida: "",
        noticias: "",
        despedida: "",
      },
      estado: {
        mundo_activo: "",
      },
    };
    fs.writeFileSync(
      CONFIG_PATH,
      yaml.dump(defaultConfig, { noRefs: true, lineWidth: 120 }) + "\n",
      "utf8"
    );
  }
}

// Lee y parsea el YAML
function _readConfig() {
  try {
    _ensureConfig();
    const text = fs.readFileSync(CONFIG_PATH, "utf8");
    return yaml.load(text) || {};
  } catch {
    return {};
  }
}

// Serializa y guarda el objeto como YAML
function _writeConfig(cfg) {
  fs.writeFileSync(
    CONFIG_PATH,
    yaml.dump(cfg, { noRefs: true, lineWidth: 120 }) + "\n",
    "utf8"
  );
}

// Inicializa api_server_path si hace falta
(function ensureApiPath() {
  const cfg = _readConfig();
  if (!cfg.paths) cfg.paths = {};
  if (!cfg.paths.api_server) {
    cfg.paths.api_server = admin_base_path;
    _writeConfig(cfg);
  }
})();

function getMinecraftPath() {
  const cfg = _readConfig();
  return cfg.paths.minecraft_server;
}
function setMinecraftPath(newPath) {
  const cfg = _readConfig();
  cfg.paths.minecraft_server = path.resolve(newPath);
  _writeConfig(cfg);
  if (!fs.existsSync(cfg.paths.minecraft_server)) {
    fs.mkdirSync(cfg.paths.minecraft_server, { recursive: true });
  }
}
function getApiPath() {
  const cfg = _readConfig();
  return cfg.paths.api_server;
}
function setApiPath(newPath) {
  const cfg = _readConfig();
  cfg.paths.api_server = path.resolve(newPath);
  _writeConfig(cfg);
  if (!fs.existsSync(cfg.paths.api_server)) {
    fs.mkdirSync(cfg.paths.api_server, { recursive: true });
  }
}

// (al final del archivo config/config.js)

function _readServerProperties(basePath) {
  const propsFile = path.join(basePath, 'server.properties');
  if (!fs.existsSync(propsFile)) return null;
  const text = fs.readFileSync(propsFile, 'utf8');
  for (let line of text.split(/\r?\n/)) {
    // ignora comentarios y líneas vacías
    if (!line || line.startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    if (key.trim() === 'level-name') {
      console.log(`🔍 level-name encontrado: ${rest.join('=')}`);
      return rest.join('=').trim();
    }
  }
  return null;
}
/**
 * Sincroniza estado.mundo_activo en server.yml leyendo server.properties
 * @returns {string|null} el level-name leído o null si no existe
 */
function syncMundoActivo() {
  const cfg  = _readConfig();
  const base = cfg.paths.minecraft_server;
  const level = _readServerProperties(base);
  if (level) {
    cfg.estado = cfg.estado || {};
    if (cfg.estado.mundo_activo !== level) {
      cfg.estado.mundo_activo = level;
      _writeConfig(cfg);
      console.log(`🔄 mundo_activo sincronizado a "${level}"`);
    }
  } else {
    console.warn(`⚠️ No se encontró server.properties en ${base}`);
  }
  return level;
}

module.exports = {
  getMinecraftPath,
  setMinecraftPath,
  getApiPath,
  setApiPath,
  _readConfig,
  _writeConfig,
  admin_base_path,
  _readServerProperties,
  syncMundoActivo  // ahora retorna el valor
};