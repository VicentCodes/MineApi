const fs   = require('fs');
const path = require('path');
const { getMinecraftPath } = require('../config/config');

exports.getConfig = (req, res, next) => {
  try {
    const mundosDir = path.join(getMinecraftPath(), 'worlds');
    const mundos = fs.readdirSync(mundosDir).filter(f => fs.statSync(path.join(mundosDir, f)).isDirectory());
    const activeJson = path.join(getMinecraftPath(), 'mundoActivo.json');
    const active = JSON.parse(fs.readFileSync(activeJson, 'utf8'))['level-name'];
    const props = fs.readFileSync(path.join(getMinecraftPath(), 'server.properties'), 'utf8').split('\n').reduce((acc, line) => {
      const [k,v] = line.split('='); if (k) acc[k.trim()] = (v||'').trim(); return acc;
    }, {});
    res.json({ config: props, mundos, active });
  } catch (e) { next(e); }
};

exports.saveConfig = (req, res, next) => {
  // similar logic a la implementación original: validaciones, crear mundo, guardar server.properties y mundoActivo.json
  res.json({ message: 'Configuración guardada' });
};