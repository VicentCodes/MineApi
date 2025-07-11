// config/config.js

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const CONFIG_DIR = __dirname;
const CONFIG_PATH = path.join(CONFIG_DIR, "server.yml");
const ADMIN_BASE_PATH = __dirname;

// Ensure the config file and directory exist
function _ensureConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      paths: {
        api_path: ADMIN_BASE_PATH,
        minecraft_path: "/home/minecraft/bedrock-server",
      },
      messages: {
        welcome: "",
        news: "",
        farewell: "",
      },
      state: {
        active_world: "",
      },
    };
    fs.writeFileSync(
      CONFIG_PATH,
      yaml.dump(defaultConfig, { noRefs: true, lineWidth: 120 }) + "\n",
      "utf8"
    );
  }
}

// Read and parse the YAML config
function _readConfig() {
  try {
    _ensureConfig();
    const text = fs.readFileSync(CONFIG_PATH, "utf8");
    return yaml.load(text) || {};
  } catch {
    return {};
  }
}

// Serialize and write the config back to YAML
function _writeConfig(cfg) {
  fs.writeFileSync(
    CONFIG_PATH,
    yaml.dump(cfg, { noRefs: true, lineWidth: 120 }) + "\n",
    "utf8"
  );
}

// Initialize api_path if missing
(function ensureApiPath() {
  const cfg = _readConfig();
  if (!cfg.paths) cfg.paths = {};
  if (!cfg.paths.api_path) {
    cfg.paths.api_path = ADMIN_BASE_PATH;
    _writeConfig(cfg);
  }
})();

// Getters and setters for Minecraft path
function getMinecraftPath() {
  const cfg = _readConfig();
  return cfg.paths.minecraft_path || cfg.paths.minecraft_server || "";
}

function setMinecraftPath(newPath) {
  const cfg = _readConfig();
  cfg.paths.minecraft_path = path.resolve(newPath);
  _writeConfig(cfg);
  if (!fs.existsSync(cfg.paths.minecraft_path)) {
    fs.mkdirSync(cfg.paths.minecraft_path, { recursive: true });
  }
}

// Getters and setters for API path
function getApiPath() {
  const cfg = _readConfig();
  return cfg.paths.api_path;
}
function setApiPath(newPath) {
  const cfg = _readConfig();
  cfg.paths.api_path = path.resolve(newPath);
  _writeConfig(cfg);
  if (!fs.existsSync(cfg.paths.api_path)) {
    fs.mkdirSync(cfg.paths.api_path, { recursive: true });
  }
}

// Read server.properties for level-name
function _readServerProperties(basePath) {
  const propsFile = path.join(basePath, "server.properties");
  if (!fs.existsSync(propsFile)) return null;
  const text = fs.readFileSync(propsFile, "utf8");
  for (let line of text.split(/\r?\n/)) {
    // skip comments and empty lines
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (key.trim() === "level-name") {
      const level = rest.join("=").trim();
      console.log(`🔍 Found level-name: ${level}`);
      return level;
    }
  }
  return null;
}

/**
 * Synchronize state.active_world in server.yml by reading server.properties.
 * @returns {string|null} the level-name, or null if not found
 */
function syncActiveWorld() {
  const cfg = _readConfig();
  const base = cfg.paths.minecraft_path;
  const level = _readServerProperties(base);
  if (level) {
    cfg.state = cfg.state || {};
    if (cfg.state.active_world !== level) {
      cfg.state.active_world = level;
      _writeConfig(cfg);
      console.log(`🔄 active_world synchronized to "${level}"`);
    }
  } else {
    console.warn(`⚠️ No server.properties found in ${base}`);
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
  ADMIN_BASE_PATH,
  _readServerProperties,
  syncActiveWorld,
};
