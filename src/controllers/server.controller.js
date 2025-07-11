const fs = require("fs");
const path = require("path");
const util = require("util");
const cp = require("child_process");

const {
  getMinecraftPath,
  setMinecraftPath,
  _readConfig,
  _writeConfig,
  admin_base_path,
} = require("../config/config");
const {
  isServerRunning,
  getServerStartTime,
  getLastStoppedTime,
  setLastStoppedTime,
  clearLastStoppedTime,
  restartServer,
  getCronLine,
} = require("../services/mc.service");

// Promisify exec and execFile for async/await
const exec = util.promisify(cp.exec);
const execFile = util.promisify(cp.execFile);

// Helper: resolve script path under config/scripts directory
function scriptPath(scriptName) {
  // admin_base_path = .../src/config
  // scripts are in .../src/config/scripts
  return path.join(admin_base_path, "scripts", scriptName);
}

// GET /api/server/path
exports.getPath = async (req, res) => {
  try {
    const serverPath = getMinecraftPath();
    return res.json({ path: serverPath });
  } catch (error) {
    console.error("getPath error:", error);
    return res.status(500).json({ error: "Could not retrieve Minecraft path" });
  }
};

// POST /api/server/path
exports.setPath = async (req, res) => {
  try {
    const { newPath } = req.body;
    if (!newPath) {
      return res.status(400).json({ error: "newPath is required" });
    }
    const resolved = path.resolve(newPath);
    if (!fs.existsSync(resolved)) {
      return res.status(400).json({ error: "Path does not exist" });
    }
    setMinecraftPath(resolved);
    const updated = getMinecraftPath();
    return res.json({ message: "Path updated successfully", path: updated });
  } catch (error) {
    console.error("setPath error:", error);
    return res.status(500).json({ error: "Failed to set Minecraft path" });
  }
};

// GET /api/server
exports.getInfo = async (req, res) => {
  try {
    const cfg = _readConfig();
    const mensajes = cfg.mensajes || {};
    const mundoActivo = cfg.estado?.mundo_activo || "";

    let backups = [];
    try {
      const backupsDir = path.join(getMinecraftPath(), "backups", "mundos");
      backups = fs
        .readdirSync(backupsDir)
        .filter((f) => f.endsWith(".zip"))
        .map((file) => ({ filename: file, label: file }));
    } catch (err) {
      console.error("getInfo backups error:", err);
    }

    const serverEncendido = isServerRunning();
    let cronActivo = false;
    try {
      const { stdout } = await exec("crontab -l");
      cronActivo = stdout.includes(getCronLine());
    } catch {
      cronActivo = false;
    }

    return res.json({
      mensajes,
      mundoActivo,
      backups,
      serverEncendido,
      cronActivo,
    });
  } catch (error) {
    console.error("getInfo error:", error);
    return res.status(500).json({ error: "Could not retrieve server info" });
  }
};

// GET /api/server/status
exports.status = async (req, res) => {
  try {
    const serverRunning = isServerRunning();
    let uptime = null;
    let lastStopped = null;

    if (serverRunning) {
      uptime = getServerStartTime();
      clearLastStoppedTime();
    } else {
      if (!getLastStoppedTime()) setLastStoppedTime();
      lastStopped = getLastStoppedTime();
    }

    return res.json({
      serverRunning,
      ...(uptime && { uptime }),
      ...(lastStopped && { lastStopped }),
    });
  } catch (error) {
    console.error("status error:", error);
    return res.status(500).json({ error: "Could not retrieve server status" });
  }
};

// POST /api/server/send-message
exports.sendMessage = async (req, res) => {
  try {
    const message = req.body.mensaje?.trim();
    if (!message) return res.status(400).json({ error: "Empty message" });
    const escaped = message.replace(/'/g, "\\'");
    const cmd = `screen -S minecraft_server -p 0 -X stuff 'say ${escaped}\\r'`;
    await exec(cmd);
    return res.json({ message: "Message sent" });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

// POST /api/server/shutdown
exports.shutdown = async (req, res) => {
  try {
    const minutes = parseInt(req.body.tiempo, 10);
    if (![0, 2, 5, 10].includes(minutes)) {
      return res.status(400).json({ error: "Invalid shutdown time" });
    }
    const script = scriptPath("apagar_con_avisos.sh");
    if (!fs.existsSync(script)) {
      console.error("shutdown script not found:", script);
      return res.status(500).json({ error: "Shutdown script not found" });
    }
    await exec(`bash "${script}" ${minutes}`);
    return res.json({
      message: `Server will shut down in ${minutes} minute(s)`,
    });
  } catch (error) {
    console.error("shutdown error:", error);
    return res.status(500).json({ error: "Shutdown command failed" });
  }
};

// POST /api/server/restart
exports.restart = async (req, res) => {
  try {
    await restartServer();
    return res.json({ message: "Server restarted" });
  } catch (error) {
    console.error("restart error:", error);
    return res.status(500).json({ error: "Failed to restart server" });
  }
};

// POST /api/server/backup
exports.backup = async (req, res) => {
  try {
    const base = getMinecraftPath();
    const script = scriptPath("backup_manual.sh");
    if (!fs.existsSync(script)) {
      console.error("backup script not found:", script);
      return res.status(500).json({ error: "Backup script not found" });
    }
    await exec(`bash "${script}" "${base}"`);
    return res.json({ message: "Backup started" });
  } catch (error) {
    console.error("backup error:", error);
    const detail = error.stderr || error.message;
    return res.status(500).json({ error: `Failed to start backup: ${detail}` });
  }
};

// POST /api/server/backup-toggle
exports.backupToggle = async (req, res) => {
  try {
    const enable = req.body.habilitar === "true";
    const cronLine = getCronLine();

    let existing = "";
    try {
      ({ stdout: existing } = await exec("crontab -l"));
    } catch {
      existing = "";
    }
    const lines = existing
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    let updated = lines;
    if (enable && !updated.includes(cronLine)) updated.push(cronLine);
    if (!enable) updated = updated.filter((l) => l !== cronLine);

    await new Promise((resolve, reject) => {
      const child = cp.spawn("crontab", ["-"]);
      child.stdin.write(updated.join("\n") + "\n");
      child.stdin.end();
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`crontab exited ${code}`))
      );
    });

    return res.json({ cronActive: enable });
  } catch (error) {
    console.error("backupToggle error:", error);
    return res.status(500).json({ error: "Failed to toggle backup cron" });
  }
};

// POST /api/server/restore-backup
exports.restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename)
      return res.status(400).json({ error: "filename is required" });

    const base = getMinecraftPath();
    const backupPath = path.join(base, "backups", "mundos", filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }

    const script = scriptPath("restaurar_backup.sh");
    if (!fs.existsSync(script)) {
      console.error("restore script not found:", script);
      return res.status(500).json({ error: "Restore script not found" });
    }

    await execFile(script, [backupPath, base]);
    return res.json({ message: `Backup restored: ${filename}` });
  } catch (error) {
    console.error("restoreBackup error:", error);
    const detail = error.stderr || error.message;
    return res
      .status(500)
      .json({ error: `Failed to restore backup: ${detail}` });
  }
};

// POST /api/server/save-messages
exports.saveMessages = async (req, res) => {
  try {
    const { bienvenida, noticias, despedida } = req.body;
    if ([bienvenida, noticias, despedida].some((v) => typeof v !== "string")) {
      return res.status(400).json({ error: "Invalid message payload" });
    }
    const cfg = _readConfig();
    cfg.mensajes = { bienvenida, noticias, despedida };
    _writeConfig(cfg);
    return res.json({ message: "Mensajes actualizados" });
  } catch (error) {
    console.error("saveMessages error:", error);
    return res.status(500).json({ error: "Failed to save messages" });
  }
};

// POST /api/server/start
exports.start = async (req, res) => {
  try {
    const base = getMinecraftPath();
    const cmd = `screen -dmS minecraft_server bash -c "cd ${base} && LD_LIBRARY_PATH=. ./bedrock_server"`;
    await exec(cmd);
    return res.json({ message: "Server started" });
  } catch (error) {
    console.error("start error:", error);
    return res.status(500).json({ error: "Failed to start server" });
  }
};

// POST /api/server/stop
exports.stop = async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      let seconds = 10;
      const interval = setInterval(() => {
        const msg =
          seconds === 0
            ? "⛔ Shutting down now..."
            : seconds === 1
            ? `⚠ Shutting down in ${seconds} second...`
            : `⚠ Shutting down in ${seconds} seconds...`;
        cp.exec(
          `screen -S minecraft_server -p 0 -X stuff \"say ${msg}$(printf '')\"`,
          (err) => {
            if (err) console.error("shutdown message error:", err);
          }
        );
        if (seconds-- === 0) {
          clearInterval(interval);
          const stopCmd = `screen -S minecraft_server -p 0 -X stuff \"stop$(printf '')\"`;
          cp.exec(stopCmd, (err) => {
            err ? reject(err) : resolve();
          });
        }
      }, 1000);
    });
    return res.json({ message: "Server stopped" });
  } catch (error) {
    console.error("stop error:", error);
    return res.status(500).json({ error: "Failed to stop server" });
  }
};
