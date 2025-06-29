const fsSrv = require('fs');
const pathSrv = require('path');
const { exec, execFile } = require('child_process');
const { getMinecraftPath, setMinecraftPath, admin_base_path } = require('../config/config');
const { isServerRunning, restartServer, getCronLine ,
  getServerUptime,
  setLastStoppedTime} = require('../services/mc.service');

// GET /api/server/path
exports.getPath = (req, res, next) => {
  try { res.json({ path: getMinecraftPath() }); } catch(e){ next(e); }
};

// POST /api/server/path
exports.setPath = (req, res, next) => {
  try {
    const { newPath } = req.body;
    if (fsSrv.existsSync(newPath)) {
      setMinecraftPath(newPath);
      res.json({ message: 'Ruta actualizada', path: getMinecraftPath() });
    } else {
      res.status(400).json({ error: 'La ruta no existe' });
    }
  } catch(e) { next(e); }
};

// GET /api/server
exports.getInfo = (req, res, next) => {
  try {
    const mensajesPath = pathSrv.join(admin_base_path, 'config', 'mensajes.json');
    let mensajes = { bienvenida:'', noticias:'', despedida:'' };
    try { mensajes = JSON.parse(fsSrv.readFileSync(mensajesPath,'utf8')); } catch {}
    const lvlJson = pathSrv.join(getMinecraftPath(),'mundoActivo.json');
    let mundoActivo = '';
    try { mundoActivo = JSON.parse(fsSrv.readFileSync(lvlJson,'utf8'))['level-name']; } catch{}
    const backupsDir = pathSrv.join(getMinecraftPath(),'backups','mundos');
    let backups = [];
    try { backups = fsSrv.readdirSync(backupsDir).filter(f=>f.endsWith('.zip')).map(f=>({filename:f,label:f})); } catch{}
    const serverEncendido = isServerRunning();
    let cronActivo=false;
    try { cronActivo = execSync('crontab -l').toString().includes(getCronLine()); } catch{}
    res.json({ mensajes, mundoActivo, backups, serverEncendido, cronActivo });
  } catch(e){ next(e); }
};

// GET /api/server/status
exports.status = (req, res, next) => {
  try {
    const serverEncendido = isServerRunning();
    let uptime = null;
    let lastStopped = null;

    if (serverEncendido) {
      uptime = getServerUptime();
      // Elimina el archivo si el server está encendido
      const fs = require('fs');
      const path = require('path');
      const { getMinecraftPath } = require('../config/config');
      const LAST_STOPPED_FILE = path.join(getMinecraftPath(), '.bedrock_server_last_stopped');
      if (fs.existsSync(LAST_STOPPED_FILE)) fs.unlinkSync(LAST_STOPPED_FILE);
    } else {
      // Solo guarda la hora si no existe
      if (!getLastStoppedTime()) {
        setLastStoppedTime();
      }
      lastStopped = getLastStoppedTime();
    }

    res.json({
      serverEncendido,
      ...(uptime && { uptime }),
      ...(lastStopped && { lastStopped })
    });
  } catch(e) {
    next(e);
  }
};


// POST /api/server/send-message
exports.sendMessage = (req, res, next) => {
  try {
    const msg = req.body.mensaje?.trim();
    if (!msg) return res.status(400).json({ error:'Mensaje vacío' });
    const cmd = `screen -S minecraft_server -p 0 -X stuff 'say ${msg.replace(/'/g,"\\'")}\\r'`;
    exec(cmd, err=>{ if(err) console.error(err); });
    res.json({ message:'Mensaje enviado' });
  } catch(e){ next(e); }
};

// POST /api/server/shutdown
exports.shutdown = (req, res, next) => {
  try {
    const minutos = parseInt(req.body.tiempo,10);
    if (![0,2,5,10].includes(minutos)) return res.status(400).json({error:'Tiempo no válido'});
    const script = pathSrv.join(admin_base_path,'scripts','apagar_con_avisos.sh');
    exec(`bash ${script} ${minutos}`, err=>{ if(err) console.error(err); });
    res.json({ message:`Apagado en ${minutos} minutos` });
  } catch(e){ next(e); }
};

// POST /api/server/restart
exports.restart = async (req, res, next) => {
  try { await restartServer(); res.json({ message:'Servidor reiniciado' }); } catch(e){ next(e); }
};

// POST /api/server/backup
exports.backup = (req, res, next) => {
  try {
    const rutaBase = getMinecraftPath();
    const lvlJson = pathSrv.join(rutaBase,'mundoActivo.json');
    let mundoActivo='bedrock_server';
    try { mundoActivo = JSON.parse(fsSrv.readFileSync(lvlJson,'utf8'))['level-name']; } catch{}
    const script = pathSrv.join(admin_base_path,'scripts','backup_manual.sh');
    exec(`bash ${script} "${rutaBase}" "${mundoActivo}"`, err=>{ if(err) console.error(err); });
    res.json({ message:'Backup iniciado' });
  } catch(e){ next(e); }
};

// POST /api/server/backup-toggle
exports.backupToggle = (req, res, next) => {
  try {
    const habilitar = req.body.habilitar==='true';
    const cronLine = getCronLine();
    exec('crontab -l',(err,stdout)=>{
      let lines = err?[]:stdout.split('\n').filter(l=>l.trim());
      if(habilitar && !lines.includes(cronLine)) lines.push(cronLine);
      if(!habilitar) lines = lines.filter(l=>l!==cronLine);
      const child = exec('crontab -'); child.stdin.write(lines.join('\n')+'\n'); child.stdin.end();
      res.json({ cronActivo:habilitar });
    });
  } catch(e){ next(e); }
};

// POST /api/server/restore-backup
exports.restoreBackup = (req, res, next) => {
  try {
    const { filename } = req.body;
    const rutaBase = getMinecraftPath();
    const backupPath = pathSrv.join(rutaBase,'backups','mundos',filename);
    const script = pathSrv.join(admin_base_path,'scripts','restaurar_backup.sh');
    execFile(script,[backupPath,rutaBase],err=>{ if(err) console.error(err); });
    res.json({ message:`Restaurando backup: ${filename}` });
  } catch(e){ next(e); }
};

// POST /api/server/save-messages
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
    const cmd = `screen -dmS minecraft_server bash -c "cd ${getMinecraftPath()} && LD_LIBRARY_PATH=. ./bedrock_server"`;
    exec(cmd, err=> err? next(err): res.json({ message:'Servidor iniciado' }));
  } catch(e){ next(e); }
};

// POST /api/server/stop
exports.stop = (req, res, next) => {
  try {
    // Enviar cuenta regresiva de mensajes antes de detener el servidor
    const mensajes = [
      '⚠ Apagando servidor en 10 segundos...',
      '⚠ Apagando en 9 segundos...',
      '⚠ Apagando en 8 segundos...',
      '⚠ Apagando en 7 segundos...',
      '⚠ Apagando en 6 segundos...',
      '⚠ Apagando en 5 segundos...',
      '⚠ Apagando en 4 segundos...',
      '⚠ Apagando en 3 segundos...',
      '⚠ Apagando en 2 segundos...',
      '⚠ Apagando en 1 segundo...',
      '⛔ Apagando ahora...'
    ];
    mensajes.forEach((msg, index) => {
      setTimeout(() => {
        const cmd = `screen -S minecraft_server -p 0 -X stuff "say ${msg}$(printf '
')"`;
        exec(cmd, err => {
          if (err) console.error(`Error al enviar mensaje de apagado: ${msg}`, err);
        });
      }, index * 1000);
    });
    // Después de los mensajes, enviar comando stop
    setTimeout(() => {
      const stopCmd = `screen -S minecraft_server -p 0 -X stuff "stop$(printf '
')"`;
      exec(stopCmd, err => {
        if (err) console.error('Error al detener el servidor:', err);
      });
    }, mensajes.length * 1000);

    res.json({ message: 'Servidor apagándose con cuenta regresiva' });
  } catch (e) {
    next(e);
  }
};

module.exports = exports;

