const { randomUUID } = require('node:crypto');
const multer = require('multer');
const storageDirectory = require('../storage');

const configuredLimit = process.env.MAX_UPLOAD_SIZE_BYTES;
if (configuredLimit !== undefined && !/^\d+$/.test(configuredLimit)) {
  throw new Error('MAX_UPLOAD_SIZE_BYTES deve ser um inteiro não negativo válido.');
}
const maxUploadSize = configuredLimit === undefined ? 10485760 : Number(configuredLimit);

const storage = multer.diskStorage({
  destination: storageDirectory,
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});

// O Busboy sinaliza o limite ao alcançá-lo, inclusive quando o tamanho é exato.
module.exports = multer({
  storage,
  defParamCharset: 'utf8',
  limits: { fileSize: maxUploadSize + 1 },
}).single('file');
