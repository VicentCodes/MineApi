const path = require('path');
const fs   = require('fs');
//const { mcFile, readJSON, writeJSON, restartServer } = require('../services/mc.service');

exports.list = (req, res, next) => {
  try {
    const allow = readJSON(mcFile('allowlist.json'));
    const ban   = readJSON(mcFile('ban-list.json'));
    res.json({ allow, ban });
  } catch (e) { next(e); }
};

exports.add = async (req, res, next) => {
  try {
    const { name, ignoresPlayerLimit } = req.body;
    const file = mcFile('allowlist.json');
    const list = readJSON(file);
    if (!list.some(p => p.name === name)) {
      list.push({ name, xuid: '', ignoresPlayerLimit: !!ignoresPlayerLimit });
      writeJSON(file, list);
      await restartServer();
    }
    res.status(201).json({ message: 'Jugador añadido' });
  } catch (e) { next(e); }
};

exports.edit = (req, res, next) => {
  try {
    const name = req.params.name;
    const newVal = req.body.ignoresPlayerLimit;
    const file = mcFile('allowlist.json');
    let list = readJSON(file);
    list = list.map(p => p.name === name ? { ...p, ignoresPlayerLimit: !!newVal } : p);
    writeJSON(file, list);
    res.json({ message: 'Jugador actualizado' });
  } catch (e) { next(e); }
};

exports.kick = (req, res, next) => {
  const player = req.params.name;
  const mensaje = req.body.message || 'Has sido expulsado por un administrador.';
  const script = path.join(require('../config/config').admin_base_path, 'scripts', 'kick_player.sh');
  execFile(script, [player, mensaje], err => {
    if (err) console.error(err);
    res.json({ message: `Expulsado: ${player}` });
  });
};

exports.ban = async (req, res, next) => {
  try {
    const name = req.params.name;
    const allowFile = mcFile('allowlist.json');
    const banFile   = mcFile('ban-list.json');
    let allow = readJSON(allowFile), ban = readJSON(banFile);
    const jugador   = allow.find(j => j.name === name);
    if (jugador) {
      ban.push(jugador);
      allow = allow.filter(j => j.name !== name);
    } else if (!ban.find(j => j.name === name)) {
      ban.push({ name });
    }
    writeJSON(allowFile, allow);
    writeJSON(banFile, ban);
    // kick + restart
    const script = path.join(require('../config/config').admin_base_path, 'scripts', 'kick_player.sh');
    execFile(script, [name, 'Has sido baneado.'], async () => {
      await restartServer();
      res.json({ message: `Baneado: ${name}` });
    });
  } catch (e) { next(e); }
};

exports.unban = async (req, res, next) => {
  try {
    const name = req.params.name;
    const allowFile = mcFile('allowlist.json');
    const banFile   = mcFile('ban-list.json');
    let allow = readJSON(allowFile), ban = readJSON(banFile);
    const jugador = ban.find(j => j.name === name);
    if (jugador) {
      allow.push(jugador);
      ban = ban.filter(j => j.name !== name);
      writeJSON(allowFile, allow);
      writeJSON(banFile, ban);
    }
    await restartServer();
    res.json({ message: `Desbaneado: ${name}` });
  } catch (e) { next(e); }
};

exports.logs = (req, res, next) => {
  try {
    const data = fs.readFileSync(mcFile('logs/latest.log'), 'utf8');
    const conexiones = data.split('\n').filter(l => l.includes('joined'));
    res.json({ conexiones });
  } catch (e) { next(e); }
};

exports.ops = (req, res, next) => {
  try {
    const ops = readJSON(mcFile('ops.json'));
    res.json({ ops });
  } catch (e) { next(e); }
};

/*
src/controllers/roles.controller.js
*/
const { mcFile, readJSON, writeJSON } = require('../services/mc.service');

exports.list = (req, res, next) => {
  try {
    const perms = readJSON(mcFile('permissions.json'));
    res.json({ perms });
  } catch (e) { next(e); }
};

exports.add = (req, res, next) => {
  try {
    const { name, xuid, permission } = req.body;
    const file = mcFile('permissions.json');
    const perms = readJSON(file);
    if (!perms.find(p => p.name === name || p.xuid === xuid)) {
      perms.push({ name, xuid, permission });
      writeJSON(file, perms);
    }
    res.json({ message: 'Permiso añadido' });
  } catch (e) { next(e); }
};

exports.update = (req, res, next) => {
  try {
    const { name, xuid, permission } = req.body;
    const file = mcFile('permissions.json');
    let perms = readJSON(file);
    perms = perms.filter(p => p.xuid !== xuid && p.name !== name);
    perms.push({ name, xuid, permission });
    writeJSON(file, perms);
    res.json({ message: 'Permiso actualizado' });
  } catch (e) { next(e); }
};