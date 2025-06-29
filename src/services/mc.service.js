const fs   = require('fs');
const path = require('path');
const { execFile, exec, execSync } = require('child_process');
const { getMinecraftPath, setMinecraftPath, admin_base_path } = require('../config/config');

// -------------------
// Utilidades de rutas
// -------------------
function getLastStoppedFilePath() {
  return path.join(__dirname, '..', 'config', '.bedrock_server_last_stopped');
}

function mcFile(subpath) {
  return path.join(getMinecraftPath(), subpath);
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ------------------------------------
// Reinicio del servidor con script bash
// ------------------------------------
async function restartServer() {
  return new Promise((resolve, reject) => {
    const script = path.join(admin_base_path, 'scripts', 'reiniciar_con_avisos.sh');
    execFile(script, err => {
      if (err) return reject(err);
      setTimeout(() => {
        const cmd = `screen -dmS minecraft_server bash -c "cd ${getMinecraftPath()} && LD_LIBRARY_PATH=. ./bedrock_server"`;
        exec(cmd, err2 => err2 ? reject(err2) : resolve());
      }, 10000);
    });
  });
}

// -----------------------------------------------------------
// Utilidad para parsear etime (ej: 1-03:10:05, 03:10:05, 10:05)
// -----------------------------------------------------------
function etimeToMilliseconds(etime) {
  // Formatos: "MM:SS", "HH:MM:SS", "DD-HH:MM:SS"
  // Ejemplo: "1-03:10:05" → 1 día, 3 horas, 10 min, 5 seg
  if (!etime) return 0;
  const regex = /(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)/;
  const parts = etime.match(regex);

  if (!parts) return 0;

  const days = parseInt(parts[1] || '0', 10);
  const hours = parseInt(parts[2] || '0', 10);
  const minutes = parseInt(parts[3], 10);
  const seconds = parseInt(parts[4], 10);

  return (
    ((days * 24 + hours) * 60 + minutes) * 60 + seconds
  ) * 1000;
}

// ---------------------------------------------
// Estado y tiempos del servidor
// ---------------------------------------------

// Detecta si el servidor está encendido
function isServerRunning() {
  try {
    const out = execSync('ps aux | grep bedrock_server | grep -v grep').toString();
    return out.includes('bedrock_server');
  } catch {
    return false;
  }
}

// Devuelve la fecha/hora de inicio del proceso en formato ISO
function getServerStartTime() {
  try {
    const out = execSync('ps aux | grep bedrock_server | grep -v grep').toString().trim();
    if (!out) return null;
    const lines = out.split('\n');
    if (lines.length === 0) return null;
    const pid = lines[0].split(/\s+/)[1];
    if (!pid) return null;
    const etime = execSync(`ps -o etime= -p ${pid}`).toString().trim();
    const msAgo = etimeToMilliseconds(etime);
    if (!msAgo) return null;
    const startTime = new Date(Date.now() - msAgo);
    return startTime.toISOString();
  } catch {
    return null;
  }
}

// Devuelve la última hora de apagado (string ISO)
function getLastStoppedTime() {
  const file = getLastStoppedFilePath();
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf8');
  }
  return null;
}

// Escribe la hora actual como hora de apagado
function setLastStoppedTime() {
  const file = getLastStoppedFilePath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file, new Date().toISOString());
}

// Borra el archivo de estado (si el server está encendido)
function clearLastStoppedTime() {
  const file = getLastStoppedFilePath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// Línea de cron (sin cambios)
function getCronLine() {
  const script = path.join(admin_base_path, 'scripts', 'backup_manual.sh');
  return `0 */4 * * * bash ${script} "${getMinecraftPath()}"`;  
}

// -----------------
// Exporta todo
// -----------------
module.exports = {
  mcFile,
  readJSON,
  writeJSON,
  restartServer,
  isServerRunning,
  getCronLine,
  getServerStartTime,
  getLastStoppedTime,
  setLastStoppedTime,
  clearLastStoppedTime
};
