// src/controllers/server.controller.js

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
} = require("../services/mc.service");

const exec = util.promisify(cp.exec);

function scriptPath(scriptName) {
  return path.join(admin_base_path, "scripts", scriptName);
}

// GET /api/server
exports.getInfo = async (req, res) => {
  try {
    // Load config and state
    const cfg = require("../config/config").readConfig();
    const messages = cfg.messages || {};
    const activeWorld = cfg.state?.activeWorld || "";

    const basePath = getMinecraftPath();

    // World backups
    const worldBackups = {};
    const worldsBase = path.join(basePath, "backups", "worlds");
    if (fs.existsSync(worldsBase)) {
      const worldDirs = fs
        .readdirSync(worldsBase, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      worldDirs.forEach((world) => {
        const dir = path.join(worldsBase, world);
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".zip"))
          .map((file) => ({
            filename: file,
            label: humanizeBackupName(file),
          }));
        worldBackups[world] = files;
      });
    }

    // Server backups
    let serverBackups = [];
    const serverDir = path.join(basePath, "backups", "server");
    if (fs.existsSync(serverDir)) {
      serverBackups = fs
        .readdirSync(serverDir)
        .filter((f) => f.endsWith(".zip"))
        .map((file) => ({
          filename: file,
          label: humanizeBackupName(file),
        }));
    }

    // Server running status
    const serverRunning = isServerRunning();

    // Detect cron job for backups
    let cronActive = false;
    let intervalHours = null;
    try {
      const scriptPath = path.join(
        __dirname,
        "..",
        "scripts",
        "backup_manual.sh"
      );
      const { stdout } = await exec("crontab -l");
      const line = stdout.split("\n").find((l) => l.includes(scriptPath));
      if (line) {
        cronActive = true;
        const m = line.match(/^0 \*\/(\d+) /);
        if (m) intervalHours = parseInt(m[1], 10);
      }
    } catch {
      cronActive = false;
    }

    return res.json({
      messages,
      activeWorld,
      worldBackups,
      serverBackups,
      serverRunning,
      cronActive,
      intervalHours,
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
    if (!newPath) return res.status(400).json({ error: "newPath is required" });

    const resolved = path.resolve(newPath);
    if (!fs.existsSync(resolved))
      return res.status(400).json({ error: "Path does not exist" });

    setMinecraftPath(resolved);
    return res.json({
      message: "Path updated successfully",
      path: getMinecraftPath(),
    });
  } catch (error) {
    console.error("setPath error:", error);
    return res.status(500).json({ error: "Failed to set Minecraft path" });
  }
};

// POST /api/server/send-message
exports.sendMessage = async (req, res) => {
  try {
    const message = req.body.message?.trim();
    if (!message) return res.status(400).json({ error: "Empty message" });
    const escaped = message.replace(/'/g, "\\'");
    await exec(`screen -S minecraft_server -p 0 -X stuff 'say ${escaped}\\r'`);
    return res.json({ message: "Message sent" });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

// POST /api/server/shutdown
exports.shutdown = async (req, res) => {
  try {
    const minutes = parseInt(req.body.time, 10);
    if (![0, 2, 5, 10].includes(minutes))
      return res.status(400).json({ error: "Invalid shutdown time" });
    const script = scriptPath("shutdown_with_warnings.sh");
    if (!fs.existsSync(script))
      return res.status(500).json({ error: "Shutdown script not found" });
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

// // POST /api/server/backup
// exports.backup = async (req, res) => {
//   try {
//     const basePath = getMinecraftPath();
//     const cfg = _readConfig();
//     const activeWorld = cfg.state?.activeWorld || "bedrock_server";
//     const script = scriptPath("backup_manual.sh");

//     if (!fs.existsSync(script)) {
//       console.error("backup script not found:", script);
//       return res.status(500).json({ error: "Backup script not found" });
//     }

//     const { stdout, stderr } = await exec(
//       `bash "${script}" "${basePath}" "${activeWorld}"`
//     );
//     console.log("Backup stdout:", stdout);
//     if (stderr) console.error("Backup stderr:", stderr);

//     return res.json({ message: "Backup started", world: activeWorld });
//   } catch (error) {
//     console.error("backup error:", error);
//     return res
//       .status(500)
//       .json({ error: `Failed to start backup: ${error.message}` });
//   }
// };

// POST /api/server/backup/world
exports.backupWorld = async (req, res) => {
  try {
    const basePath = getMinecraftPath();
    const cfg = _readConfig();
    const activeWorld = cfg.state?.activeWorld || "bedrock_server";
    const script = scriptPath("backup_world.sh");

    if (!fs.existsSync(script)) {
      console.error("backup_world script not found:", script);
      return res.status(500).json({ error: "Script de backup de mundo no encontrado" });
    }

    const { stdout, stderr } = await exec(
      `bash "${script}" "${basePath}" "${activeWorld}"`
    );
    console.log("World backup stdout:", stdout);
    if (stderr) console.error("World backup stderr:", stderr);

    return res.json({ message: "World backup iniciado", world: activeWorld });
  } catch (error) {
    console.error("backupWorld error:", error);
    return res
      .status(500)
      .json({ error: `Fallo al iniciar backup de mundo: ${error.message}` });
  }
};

// POST /api/server/backup/config
exports.backupConfig = async (req, res) => {
  try {
    const basePath = getMinecraftPath();
    const script = scriptPath("backup_server.sh");

    if (!fs.existsSync(script)) {
      console.error("backup_server script not found:", script);
      return res.status(500).json({ error: "Script de backup de servidor no encontrado" });
    }

    const { stdout, stderr } = await exec(
      `bash "${script}" "${basePath}"`
    );
    console.log("Server backup stdout:", stdout);
    if (stderr) console.error("Server backup stderr:", stderr);

    return res.json({ message: "Server backup iniciado" });
  } catch (error) {
    console.error("backupConfig error:", error);
    return res
      .status(500)
      .json({ error: `Fallo al iniciar backup de servidor: ${error.message}` });
  }
};

// POST /api/server/backup-toggle
exports.backupToggle = async (req, res) => {
  try {
    const enable = Boolean(req.body.enabled);
    let intervalHrs = parseInt(req.body.interval, 10);
    if (isNaN(intervalHrs) || intervalHrs < 1) intervalHrs = 4;

    const basePath = getMinecraftPath();
    const cfg = _readConfig();
    const activeWorld = cfg.state?.activeWorld || "";
    const script = scriptPath("backup_manual.sh");
    const cronCmd = `bash "${script}" "${basePath}" "${activeWorld}"`;
    const cronLine = `0 */${intervalHrs} * * * ${cronCmd}`;

    let existing = "";
    try {
      ({ stdout: existing } = await exec("crontab -l"));
    } catch {}
    const lines = existing
      .split("\n")
      .filter((l) => l.trim() && !l.includes(script));

    if (enable) lines.push(cronLine);

    await new Promise((resolve, reject) => {
      const child = cp.spawn("crontab", ["-"]);
      child.stdin.write(lines.join("\n") + "\n");
      child.stdin.end();
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`crontab exited ${code}`))
      );
    });

    return res.json({
      cronActive: enable,
      intervalHours: enable ? intervalHrs : null,
    });
  } catch (error) {
    console.error("backupToggle error:", error);
    return res.status(500).json({ error: "Failed to toggle backup cron" });
  }
};

// POST /api/server/restore
exports.restoreBackup = async (req, res) => {
  console.log("[restoreBackup] Invocado");
  try {
    const { filename } = req.body;
    console.log("[restoreBackup] Parámetro filename:", filename);
    if (!filename) {
      console.warn("[restoreBackup] Error: filename es requerido");
      return res.status(400).json({ error: "filename is required" });
    }

    const basePath = getMinecraftPath();
    console.log("[restoreBackup] basePath:", basePath);

    const cfg = _readConfig();
    const activeWorld = cfg.state?.activeWorld;
    console.log("[restoreBackup] activeWorld:", activeWorld);
    if (!activeWorld) {
      console.warn("[restoreBackup] Error: No activeWorld definido en config");
      return res
        .status(400)
        .json({ error: "No activeWorld definido en server.yml" });
    }

    const backupPath = path.join(
      basePath,
      "backups",
      "worlds",
      activeWorld,
      filename
    );
    console.log("[restoreBackup] backupPath:", backupPath);
    if (!fs.existsSync(backupPath)) {
      console.error("[restoreBackup] Error: backup file no encontrado");
      return res.status(404).json({ error: "Backup file not found" });
    }

    const script = scriptPath("restore_backup.sh");
    console.log("[restoreBackup] scriptPath:", script);
    if (!fs.existsSync(script)) {
      console.error("[restoreBackup] Error: restore script no encontrado");
      return res.status(500).json({ error: "Restore script not found" });
    }

    const cmd = `bash "${script}" "${backupPath}" "${basePath}" "${activeWorld}"`;
    console.log("[restoreBackup] Ejecutando comando:", cmd);
    const { stdout, stderr } = await exec(cmd);

    console.log("[restoreBackup] stdout:", stdout.trim() || "(sin salida)");
    if (stderr) console.error("[restoreBackup] stderr:", stderr.trim());

    console.log("[restoreBackup] ¡Script de restauración finalizado con éxito!");
    return res.json({ message: `Backup restored: ${filename}` });
  } catch (error) {
    console.error("[restoreBackup] ERROR en la ejecución:", error);
    if (error.stdout) console.error("[restoreBackup] error.stdout:", error.stdout);
    if (error.stderr) console.error("[restoreBackup] error.stderr:", error.stderr);

    const detail = error.stderr || error.message;
    return res
      .status(500)
      .json({ error: `Failed to restore backup: ${detail}` });
  }
};



// POST /api/server/save-messages
exports.saveMessages = async (req, res) => {
  try {
    const { welcome, news, farewell } = req.body;
    if ([welcome, news, farewell].some((v) => typeof v !== "string")) {
      return res.status(400).json({ error: "Invalid message payload" });
    }
    const cfg = _readConfig();
    cfg.messages = { welcome, news, farewell };
    _writeConfig(cfg);
    return res.json({ message: "Messages updated" });
  } catch (error) {
    console.error("saveMessages error:", error);
    return res.status(500).json({ error: "Failed to save messages" });
  }
};

// POST /api/server/start
exports.start = async (req, res) => {
  try {
    const basePath = getMinecraftPath();
    await exec(
      `screen -dmS minecraft_server bash -c "cd ${basePath} && LD_LIBRARY_PATH=. ./bedrock_server"`
    );
    return res.json({ message: "Server started" });
  } catch (error) {
    console.error("start error:", error);
    return res.status(500).json({ error: "Failed to start server" });
  }
};

// POST /api/server/stop
exports.stop = async (req, res) => {
  try {
    const exec = util.promisify(cp.exec);

    // 1) Obtener lista de sesiones activas (*.minecraft_server)
    const { stdout: list } = await exec(
      `screen -ls | grep '\\.minecraft_server' | awk '{print $1}'`
    );
    const sessions = list
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sessions.length === 0) {
      console.warn("stop: no hay sesiones de minecraft_server activas");
      return res
        .status(400)
        .json({ error: "No active minecraft_server sessions found" });
    }

    // 2) Promise con countdown y stop
    await new Promise((resolve, reject) => {
      let seconds = 10;

      const interval = setInterval(() => {
        // Construir mensaje y enviarlo a cada sesión
        const text =
          seconds === 0
            ? "⛔ Shutting down now..."
            : seconds === 1
            ? `⚠ Shutting down in ${seconds} second...`
            : `⚠ Shutting down in ${seconds} seconds...`;

        sessions.forEach((ses) => {
          // IMPORTANT: añadimos \r al final para que Screen ejecute el comando
          cp.exec(
            `screen -S ${ses} -p 0 -X stuff "say ${text}$(printf '\\r')"`
          );
        });

        if (seconds-- === 0) {
          clearInterval(interval);
          // Enviar stop a todas
          sessions.forEach((ses) => {
            cp.exec(
              `screen -S ${ses} -p 0 -X stuff "stop$(printf '\\r')"`
            );
          });
          // Pequeña espera para asegurarnos de que termine
          setTimeout(resolve, 1000);
        }
      }, 1000);
    });

    return res.json({ message: "Server stopped" });
  } catch (error) {
    console.error("stop error:", error);
    return res.status(500).json({ error: "Failed to stop server" });
  }
};

