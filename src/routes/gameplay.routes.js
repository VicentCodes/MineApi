const router = require('express').Router();
const ctrl   = require('../controllers/gameplay.controller');

router.get('/', ctrl.getConfig);
router.post('/', ctrl.saveConfig);

module.exports = router;