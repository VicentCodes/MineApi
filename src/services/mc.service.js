const fs   = require('fs');
const path = require('path');
const { execFile, exec, execSync } = require('child_process');
const { getMinecraftPath, setMinecraftPath, admin_base_path } = require('../config/config');

// Archivo para la hora de apagado
function getLastStoppedFilePath() {
  return path.join(getMinecraftPath(), '.bedrock_server_last_stopped');
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

// USAR MÉTODO ORIGINAL PARA TU ENTORNO
function isServerRunning() {
  try {
    const out = execSync('ps aux | grep bedrock_server | grep -v grep').toString();
    return out.includes('bedrock_server');
  } catch {
    return false;
  }
}

// Uptime usando el PID del proceso (si existe)
function getServerUptime() {
  try {
    // Buscar el PID usando ps aux
    const out = execSync('ps aux | grep bedrock_server | grep -v grep').toString().trim();
    if (!out) return null;
    // La columna 2 es el PID
    const lines = out.split('\n');
    if (lines.length === 0) return null;
    const pid = lines[0].split(/\s+/)[1];
    if (!pid) return null;
    // Consultar el uptime de ese PID
    const etime = execSync(`ps -o etime= -p ${pid}`).toString().trim();
    return etime;
  } catch {
    return null;
  }
}

function getLastStoppedTime() {
  const file = getLastStoppedFilePath();
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf8');
  }
  return null;
}

function setLastStoppedTime() {
  const file = getLastStoppedFilePath();
  fs.writeFileSync(file, new Date().toISOString());
}

function clearLastStoppedTime() {
  const file = getLastStoppedFilePath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function getCronLine() {
  const script = path.join(admin_base_path, 'scripts', 'backup_manual.sh');
  return `0 */4 * * * bash ${script} "${getMinecraftPath()}"`;  
}

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
