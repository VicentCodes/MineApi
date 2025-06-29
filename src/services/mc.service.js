const fs   = require('fs');
const path = require('path');
const { execFile, exec, execSync } = require('child_process');
const { getMinecraftPath, setMinecraftPath, admin_base_path } = require('../config/config');

// Archivos y utilidades generales
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

// Función para reiniciar el servidor (igual que antes)
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

// Devuelve la ruta al archivo de estado
function getLastStoppedFilePath() {
  return path.join(getMinecraftPath(), '.bedrock_server_last_stopped');
}

// Detecta el PID del proceso real del servidor
function getServerPID() {
  try {
    const out = execSync("pgrep -f bedrock_server").toString().split('\n')[0];
    return out.trim() || null;
  } catch {
    return null;
  }
}

// Devuelve true/false si el server está corriendo
function isServerRunning() {
  const pid = getServerPID();
  return !!pid && pid !== "";
}

// Devuelve el uptime (ejemplo: "01:03:27" o "2-03:14:08")
function getServerUptime() {
  const pid = getServerPID();
  if (!pid) return null;
  try {
    const out = execSync(`ps -o etime= -p ${pid}`).toString();
    return out.trim();
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

// Exporta todo
module.exports = {
  mcFile,
  readJSON,
  writeJSON,
  restartServer,
  isServerRunning,
  getCronLine,
  getServerUptime,
  getLastStoppedTime,
  setLastStoppedTime,
  clearLastStoppedTime
};
