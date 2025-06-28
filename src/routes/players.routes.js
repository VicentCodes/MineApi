const router = require('express').Router();
const ctrl   = require('../controllers/players.controller');

router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.put('/:name', ctrl.edit);
router.post('/:name/kick', ctrl.kick);
router.post('/:name/ban', ctrl.ban);
router.delete('/:name/ban', ctrl.unban);
router.get('/logs', ctrl.logs);
router.get('/ops', ctrl.ops);

module.exports = router;