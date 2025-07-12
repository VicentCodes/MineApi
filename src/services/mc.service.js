// src/services/mc.service.js

const fs = require("fs");
const path = require("path");
const { execFile, execSync } = require("child_process");
const { getMinecraftPath } = require("../config/config");

// Restart server with warnings
async function restartServer() {
  return new Promise((resolve, reject) => {
    const script = path.join(
      __dirname,
      "..",
      "scripts",
      "restart_with_warnings.sh"
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

// Convert "DD-HH:MM:SS" to milliseconds
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

// Is the bedrock_server process alive?
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

// Get server start time in ISO
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

// Returns the default cron line for 4-hour backups
function getCronLine() {
  const script = path.join(__dirname, "..", "scripts", "backup_manual.sh");
  return `0 */4 * * * bash ${script} "${getMinecraftPath()}"`;
}

// Generate a human-readable label from a backup filename like "world-20250712T153045.zip"
function humanizeBackupName(filename) {
  const name = path.parse(filename).name;
  const m = name.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd, hh, min, ss] = m;
    const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`);
    // Format in Spanish locale; adjust locale if needed
    return date.toLocaleString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  // Fallback: replace underscores/hyphens with spaces
  return name.replace(/[_-]/g, " ");
}

module.exports = {
  restartServer,
  isServerRunning,
  getServerStartTime,
  getLastStoppedTime,
  setLastStoppedTime,
  clearLastStoppedTime,
  getCronLine,
  humanizeBackupName,
};
