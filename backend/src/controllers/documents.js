const documents = require('../services/documents');

function requireOwner(req, res, next) {
  const owner = req.get('x-user-id');
  if (!owner || !owner.trim()) {
    return res.status(400).json({ error: 'O cabeçalho x-user-id é obrigatório.' });
  }
  req.owner = owner;
  next();
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'O arquivo é obrigatório.' });
  }
  return res.status(201).json(documents.create(req.file, req.owner));
}

function list(req, res) {
  res.json(documents.list(req.owner));
}

function download(req, res, next) {
  const file = documents.findFile(req.params.id, req.owner);
  if (!file) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }
  res.download(file.filePath, file.originalName, (error) => {
    if (error) {
      if (error.code === 'ENOENT' && !res.headersSent) {
        console.error('Erro ao acessar documento:', error);
        res.removeHeader('Content-Disposition');
        return res.status(404).json({ error: 'Documento não encontrado.' });
      }
      next(error);
    }
  });
}

module.exports = { requireOwner, upload, list, download };
