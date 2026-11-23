const express = require('express');
const controller = require('../controllers/documents');
const upload = require('../middlewares/upload');
const router = express.Router();

router.post('/upload', controller.requireOwner, upload, controller.upload);
router.get('/documents', controller.requireOwner, controller.list);
router.get('/documents/:id/download', controller.requireOwner, controller.download);

module.exports = router;
