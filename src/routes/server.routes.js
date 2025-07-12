const router = require("express").Router();
const ctrl = require("../controllers/server.controller");

router.get("/path", ctrl.getPath);
router.post("/path", ctrl.setPath);
router.get("/", ctrl.getInfo);
router.get("/status", ctrl.status);
router.post("/send-message", ctrl.sendMessage);
router.post("/shutdown", ctrl.shutdown);
router.post("/restart", ctrl.restart);
//  (-router.post("/backup", ctrl.backup))

+router.post("/backup/world", ctrl.backupWorld);
+router.post("/backup/config", ctrl.backupConfig);
router.post("/backup-toggle", ctrl.backupToggle);
router.post("/restore-backup", ctrl.restoreBackup);
router.post("/save-messages", ctrl.saveMessages);
router.post("/start", ctrl.start);
router.post("/stop", ctrl.stop);

module.exports = router;
