// services/mc.service.js
const fs = require("fs");
const path = require("path");
const { execFile, execSync } = require("child_process");
const { getMinecraftPath } = require("../config/config");

// Reinicia el servidor con avisos
async function restartServer() {
  return new Promise((resolve, reject) => {
    const script = path.join(
      __dirname,
      "..",
      "scripts",
      "reiniciar_con_avisos.sh"
    );
    execFile(script, (err) => {
      if (err) return reject(err);
      setTimeout(() => {
        const cmd = `screen -dmS minecraft_server bash -c "cd ${getMinecraftPath()} && LD_LIBRARY_PATH=. ./bedrock_server"`;
        execFile(cmd, (err2) => (err2 ? reject(err2) : resolve()));
      }, 10000);
    });
  });
}

// Convierte "DD-HH:MM:SS" a milisegundos
function etimeToMilliseconds(etime) {
  if (!etime) return 0;
  const regex = /(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)/;
  const parts = etime.match(regex);
  if (!parts) return 0;
  const days = +parts[1] || 0;
  const hours = +parts[2] || 0;
  const minutes = +parts[3];
  const seconds = +parts[4];
  return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

// ¿El proceso bedrock_server está vivo?
function isServerRunning() {
  try {
    const out = execSync(
      "ps aux | grep bedrock_server | grep -v grep"
    ).toString();
    return out.includes("bedrock_server");
  } catch {
    return false;
  }
}

// Hora de inicio en ISO
function getServerStartTime() {
  try {
    const out = execSync("ps aux | grep bedrock_server | grep -v grep")
      .toString()
      .trim();
    if (!out) return null;
    const pid = out.split(/\s+/)[1];
    const etime = execSync(`ps -o etime= -p ${pid}`).toString().trim();
    const msAgo = etimeToMilliseconds(etime);
    return msAgo ? new Date(Date.now() - msAgo).toISOString() : null;
  } catch {
    return null;
  }
}

// Archivo donde guardamos la última hora de apagado
function getLastStoppedFilePath() {
  return path.join(__dirname, "..", "config", ".bedrock_server_last_stopped");
}

function getLastStoppedTime() {
  const file = getLastStoppedFilePath();
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}
function setLastStoppedTime() {
  const file = getLastStoppedFilePath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, new Date().toISOString());
}
function clearLastStoppedTime() {
  const file = getLastStoppedFilePath();
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// Línea de cron para backups automáticos
function getCronLine() {
  const script = path.join(__dirname, "..", "scripts", "backup_manual.sh");
  return `0 */4 * * * bash ${script} "${getMinecraftPath()}"`;
}

module.exports = {
  restartServer,
  isServerRunning,
  getServerStartTime,
  getLastStoppedTime,
  setLastStoppedTime,
  clearLastStoppedTime,
  getCronLine,
};
