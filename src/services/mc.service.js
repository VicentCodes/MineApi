const fs   = require('fs');
const path = require('path');
const { execFile, exec, execSync } = require('child_process');
const { getMinecraftPath, setMinecraftPath, admin_base_path } = require('../config/config');

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

function isServerRunning() {
  try {
    const out = execSync('ps aux | grep bedrock_server | grep -v grep').toString();
    return out.includes('bedrock_server');
  } catch {
    return false;
  }
}

function getCronLine() {
  const script = path.join(admin_base_path, 'scripts', 'backup_manual.sh');
  return `0 */4 * * * bash ${script} "${getMinecraftPath()}"`;  
}

const LAST_STOPPED_FILE = path.join(getMinecraftPath(), '.bedrock_server_last_stopped');

function getServerPID() {
  try {
    const out = execSync("pgrep -f bedrock_server").toString().split('\n')[0];
    return out.trim();
  } catch {
    return null;
  }
}

function isServerRunning() {
  return !!getServerPID();
}

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

function getLastStoppedTime() {
  if (fs.existsSync(LAST_STOPPED_FILE)) {
    return fs.readFileSync(LAST_STOPPED_FILE, 'utf8');
  }
  return null;
}

function setLastStoppedTime() {
  fs.writeFileSync(LAST_STOPPED_FILE, new Date().toISOString());
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
  setLastStoppedTime
};
