const fsSrv = require('fs');
const pathSrv = require('path');
const { exec, execFile } = require('child_process');
const { getMinecraftPath, setMinecraftPath, admin_base_path } = require('../config/config');
const { 
  isServerRunning, 
  getServerStartTime, 
  getLastStoppedTime, 
  setLastStoppedTime, 
  clearLastStoppedTime 
} = require('../services/mc.service');

// GET /api/server/path
exports.getPath = (req, res, next) => {
  try { res.json({ path: getMinecraftPath() }); } catch(e){ next(e); }
};

// POST /api/server/path
exports.setPath = (req, res, next) => {
  try {
    const { newPath } = req.body;

    if (!fsSrv.existsSync(newPath)) {
      return res.status(400).json({ error: "Path does not exist" });
    }

    setMinecraftPath(newPath);
    res.json({
      message: "Path updated successfully",
      path: getMinecraftPath(),
    });
  } catch (err) {
    next(err);
  }
};


// GET /api/server
exports.getInfo = (req, res, next) => {
  try {
    const mensajesPath = pathSrv.join(
      admin_base_path,
      "config",
      "mensajes.json"
    );
    const lvlJsonPath = pathSrv.join(getMinecraftPath(), "mundoActivo.json");
    const backupsDir = pathSrv.join(getMinecraftPath(), "backups", "mundos");

    let mensajes = { bienvenida: "", noticias: "", despedida: "" };
    try {
      mensajes = JSON.parse(fsSrv.readFileSync(mensajesPath, "utf8"));
    } catch {
      // default mensajes if file missing or invalid
    }

    let mundoActivo = "";
    try {
      const lvlData = JSON.parse(fsSrv.readFileSync(lvlJsonPath, "utf8"));
      mundoActivo = lvlData["level-name"] || "";
    } catch {}

    let backups = [];
    try {
      backups = fsSrv
        .readdirSync(backupsDir)
        .filter((file) => file.endsWith(".zip"))
        .map((file) => ({ filename: file, label: file }));
    } catch {}

    const serverEncendido = isServerRunning();

    let cronActivo = false;
    try {
      const crontab = execSync("crontab -l").toString();
      cronActivo = crontab.includes(getCronLine());
    } catch {
      // crontab might not exist
    }

    res.json({
      mensajes,
      mundoActivo,
      backups,
      serverEncendido,
      cronActivo,
    });
  } catch (err) {
    next(err);
  }
};


// GET /api/server/status
exports.status = (req, res, next) => {
  try {
    const serverRunning = isServerRunning();
    let uptime = null;
    let lastStopped = null;

    if (serverRunning) {
      uptime = getServerStartTime(); 
      clearLastStoppedTime(); 
    } else {
      if (!getLastStoppedTime()) {
        setLastStoppedTime();
      }
      lastStopped = getLastStoppedTime();
    }

    res.json({
      serverRunning,
      ...(uptime && { uptime }),
      ...(lastStopped && { lastStopped }),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/server/send-message
exports.sendMessage = (req, res, next) => {
  try {
    const message = req.body.mensaje?.trim();

    if (!message) {
      return res.status(400).json({ error: "Empty message" });
    }

    const escapedMessage = message.replace(/'/g, "\\'");
    const cmd = `screen -S minecraft_server -p 0 -X stuff 'say ${escapedMessage}\\r'`;

    exec(cmd, (err) => {
      if (err) {
        console.error("Error sending message to server:", err);
      }
    });

    res.json({ message: "Message sent" });
  } catch (err) {
    next(err);
  }
};


// POST /api/server/shutdown
exports.shutdown = (req, res, next) => {
  try {
    const minutes = parseInt(req.body.tiempo, 10);

    if (![0, 2, 5, 10].includes(minutes)) {
      return res.status(400).json({ error: "Invalid shutdown time" });
    }

    const scriptPath = pathSrv.join(
      admin_base_path,
      "scripts",
      "apagar_con_avisos.sh"
    );
    const cmd = `bash ${scriptPath} ${minutes}`;

    exec(cmd, (err) => {
      if (err) {
        console.error("Error executing shutdown script:", err);
      }
    });

    res.json({ message: `Server will shut down in ${minutes} minute(s)` });
  } catch (err) {
    next(err);
  }
};


// POST /api/server/restart
exports.restart = async (req, res, next) => {
  try {
    await restartServer();
    res.json({ message: "Server restarted" });
  } catch (err) {
    next(err);
  }
};


// POST /api/server/backup
exports.backup = (req, res, next) => {
  try {
    const basePath = getMinecraftPath();
    const lvlJsonPath = pathSrv.join(basePath, "mundoActivo.json");

    let activeWorld = "bedrock_server";
    try {
      const data = JSON.parse(fsSrv.readFileSync(lvlJsonPath, "utf8"));
      activeWorld = data["level-name"] || activeWorld;
    } catch {
      // fallback to default if file missing or invalid
    }

    const scriptPath = pathSrv.join(
      admin_base_path,
      "scripts",
      "backup_manual.sh"
    );
    const cmd = `bash ${scriptPath} "${basePath}" "${activeWorld}"`;

    exec(cmd, (err) => {
      if (err) {
        console.error("Error executing backup script:", err);
      }
    });

    res.json({ message: "Backup started" });
  } catch (err) {
    next(err);
  }
};


// POST /api/server/backup-toggle
exports.backupToggle = (req, res, next) => {
  try {
    const enable = req.body.habilitar === "true";
    const cronLine = getCronLine();

    exec("crontab -l", (err, stdout) => {
      let lines = [];

      if (!err) {
        lines = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }

      if (enable && !lines.includes(cronLine)) {
        lines.push(cronLine);
      }

      if (!enable) {
        lines = lines.filter((line) => line !== cronLine);
      }

      const child = exec("crontab -");
      child.stdin.write(lines.join("\n") + "\n");
      child.stdin.end();

      res.json({ cronActive: enable });
    });
  } catch (err) {
    next(err);
  }
};


// POST /api/server/restore-backup
exports.restoreBackup = (req, res, next) => {
  try {
    const { filename } = req.body;
    const basePath = getMinecraftPath();
    const backupPath = pathSrv.join(basePath, "backups", "mundos", filename);
    const scriptPath = pathSrv.join(
      admin_base_path,
      "scripts",
      "restaurar_backup.sh"
    );

    execFile(scriptPath, [backupPath, basePath], (err) => {
      if (err) {
        console.error("Error restoring backup:", err);
      }
    });

    res.json({ message: `Restoring backup: ${filename}` });
  } catch (err) {
    next(err);
  }
};


// POST /api/server/save-messages. Pending
exports.saveMessages = (req, res, next) => {
  try {
    const { bienvenida, noticias, despedida } = req.body;
    const pathMsgs = pathSrv.join(admin_base_path,'config','mensajes.json');
    fsSrv.writeFileSync(pathMsgs, JSON.stringify({ bienvenida, noticias, despedida },null,2));
    res.json({ message:'Mensajes actualizados' });
  } catch(e){ next(e); }
};

// POST /api/server/start
exports.start = (req, res, next) => {
  try {
    const serverPath = getMinecraftPath();
    const cmd = `screen -dmS minecraft_server bash -c "cd ${serverPath} && LD_LIBRARY_PATH=. ./bedrock_server"`;

    exec(cmd, (err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "Server started" });
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/server/stop
exports.stop = (req, res, next) => {
  try {
    let seconds = 10;

    const interval = setInterval(() => {
      const message =
        seconds === 0
          ? "⛔ Shutting down now..."
          : seconds === 1
          ? `⚠ Shutting down in ${seconds} second...`
          : `⚠ Shutting down in ${seconds} seconds...`;

      const cmd = `screen -S minecraft_server -p 0 -X stuff "say ${message}$(printf '')"`;

      exec(cmd, (err) => {
        if (err) {
          console.error(`Error sending shutdown message: ${message}`, err);
        }
      });

      if (seconds-- === 0) {
        clearInterval(interval);
      }
    }, 1000);

    // After countdown, send stop command
    setTimeout(() => {
      const stopCmd = `screen -S minecraft_server -p 0 -X stuff "stop$(printf '')"`;
      exec(stopCmd, (err) => {
        if (err) {
          console.error("Error stopping the server:", err);
        }
      });
    }, (seconds + 1) * 1000);

    res.json({ message: "Server shutting down with countdown" });
  } catch (err) {
    next(err);
  }
};


module.exports = exports;

