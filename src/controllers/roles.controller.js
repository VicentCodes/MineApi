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