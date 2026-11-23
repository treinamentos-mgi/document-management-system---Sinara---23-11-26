const { randomUUID } = require('node:crypto');
const path = require('node:path');
const documents = require('../repositories/documents');
const storageDirectory = require('../storage');

function publicMetadata({ id, originalName, size, uploadedAt, owner }) {
  return { id, originalName, size, uploadedAt, owner };
}

function create(file, owner) {
  const document = documents.save({
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storedName: file.filename,
  });
  return publicMetadata(document);
}

function list(owner) {
  return documents.findByOwner(owner).map(publicMetadata);
}

function findFile(id, owner) {
  const document = documents.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }
  const filePath = path.resolve(storageDirectory, document.storedName);
  const relativePath = path.relative(storageDirectory, filePath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return {
    filePath,
    originalName: document.originalName,
  };
}

module.exports = { create, list, findFile };
