const router = require('express').Router();
const ctrl   = require('../controllers/roles.controller');

router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.put('/', ctrl.update);

module.exports = router;