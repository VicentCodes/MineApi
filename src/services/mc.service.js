// src/services/mc.service.js

const fs = require("fs");
const path = require("path");
const { execFile, execSync } = require("child_process");
const { getMinecraftPath } = require("../config/config");

// Restart the server with warnings
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
      // wait 10s then start fresh
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

// Path to store last stopped timestamp
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

// Default cron entry for backups every 4h
function getCronEntry() {
  const script = path.join(__dirname, "..", "scripts", "manual_backup.sh");
  return `0 */4 * * * bash ${script} "${getMinecraftPath()}"`;
}

module.exports = {
  restartServer,
  isServerRunning,
  getServerStartTime,
  getLastStoppedTime,
  setLastStoppedTime,
  clearLastStoppedTime,
  getCronEntry,
};
