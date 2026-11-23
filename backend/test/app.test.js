const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');

delete process.env.MAX_UPLOAD_SIZE_BYTES;
const app = require('../src/app');
const repository = require('../src/repositories/documents');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('o limite padrão aceita 10485760 bytes e rejeita um byte a mais', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const uploadedFiles = [];
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await Promise.all(uploadedFiles.map((name) => fs.unlink(path.resolve(__dirname, '../storage', name))));
  });

  for (const [size, expectedStatus] of [[10485760, 201], [10485761, 413]]) {
    const body = new FormData();
    body.append('file', new Blob([Buffer.alloc(size)]), 'limite.bin');
    const response = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'x-user-id': 'teste' },
      body,
    });
    const result = await response.json();
    if (response.status === 201) {
      uploadedFiles.push(repository.findById(result.id).storedName);
    }
    assert.equal(response.status, expectedStatus);
    if (expectedStatus === 201) {
      assert.equal(result.size, size);
    } else {
      assert.equal(typeof result.error, 'string');
    }
  }
});
