const multer = require('multer');

module.exports = function errorHandler(error, req, res, next) {
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
};
