const { randomUUID } = require('node:crypto');
const path = require('node:path');
const express = require('express');
const multer = require('multer');
const controller = require('../controllers/documents');

const configuredLimit = process.env.MAX_UPLOAD_SIZE_BYTES;
const maxUploadSize = configuredLimit === undefined ? 10485760 : Number(configuredLimit);
if (
  (configuredLimit !== undefined && !/^\d+$/.test(configuredLimit)) ||
  !Number.isSafeInteger(maxUploadSize) ||
  maxUploadSize < 0 ||
  maxUploadSize >= Number.MAX_SAFE_INTEGER
) {
  throw new Error('MAX_UPLOAD_SIZE_BYTES deve ser um inteiro não negativo válido.');
}

const storage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../storage'),
  filename(req, file, callback) {
    let name;
    do {
      name = randomUUID();
    } while (name === file.originalname);
    callback(null, name);
  },
});

// O Busboy sinaliza o limite ao alcançá-lo, inclusive quando o tamanho é exato.
const upload = multer({ storage, limits: { fileSize: maxUploadSize + 1 } });
const router = express.Router();

router.post('/upload', controller.requireOwner, upload.single('file'), controller.upload);
router.get('/documents', controller.requireOwner, controller.list);
router.get('/documents/:id/download', controller.requireOwner, controller.download);

router.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: status === 413 ? 'O arquivo excede o tamanho máximo permitido.' : 'Upload inválido.',
    });
  }
  console.error('Erro ao processar documento:', error);
  return res.status(500).json({ error: 'Erro interno ao processar documento.' });
});

module.exports = router;
