const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');

process.env.MAX_UPLOAD_SIZE_BYTES = '5';
const app = require('../src/app');
const repository = require('../src/repositories/documents');
const storage = path.resolve(__dirname, '../storage');

test('contratos de upload, listagem e download', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const uploadedFiles = [];
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await Promise.all(uploadedFiles.map((name) => fs.unlink(path.join(storage, name))));
  });

  function form(contents, name = 'documento.txt', field = 'file') {
    const data = new FormData();
    data.append(field, new Blob([contents]), name);
    return data;
  }

  async function upload(owner, contents, name) {
    const response = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'x-user-id': owner },
      body: form(contents, name),
    });
    const body = await response.json();
    if (response.status === 201) {
      uploadedFiles.push(repository.findById(body.id).storedName);
    }
    return { response, body };
  }

  await t.test('mantém o health existente', async () => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  await t.test('exige o cabeçalho em todas as operações antes do upload', async () => {
    for (const owner of [undefined, '   ']) {
      for (const [url, options] of [
        ['/upload', { method: 'POST', body: form('abc') }],
        ['/documents', {}],
        ['/documents/inexistente/download', {}],
      ]) {
        const headers = owner === undefined ? {} : { 'x-user-id': owner };
        const response = await fetch(base + url, { ...options, headers });
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).error, 'string');
      }
    }
  });

  await t.test('rejeita arquivo ausente e campo incorreto', async () => {
    for (const body of [new FormData(), form('abc', 'nome.txt', 'outro')]) {
      const response = await fetch(`${base}/upload`, {
        method: 'POST',
        headers: { 'x-user-id': 'alice' },
        body,
      });
      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).error, 'string');
    }
    const invalidJson = await fetch(`${base}/upload`, {
      method: 'POST',
      headers: { 'x-user-id': 'alice', 'content-type': 'application/json' },
      body: '{',
    });
    assert.equal(invalidJson.status, 400);
    assert.equal(typeof (await invalidJson.json()).error, 'string');
  });

  let aliceDocument;
  let bobDocument;
  await t.test('aceita o tamanho exato e expõe apenas metadados públicos', async () => {
    const { response, body } = await upload('alice', 'abcde', 'documento.txt');
    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(body).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
    assert.equal(body.originalName, 'documento.txt');
    assert.equal(body.owner, 'alice');
    assert.equal(body.size, 5);
    assert.equal(new Date(body.uploadedAt).toISOString(), body.uploadedAt);
    const storedName = repository.findById(body.id).storedName;
    assert.notEqual(storedName, body.originalName);
    assert.equal(path.basename(storedName), storedName);
    assert.equal(await fs.readFile(path.join(storage, storedName), 'utf8'), 'abcde');
    aliceDocument = body;

    const bob = await upload('bob', 'xyz', 'outro.txt');
    assert.equal(bob.response.status, 201);
    bobDocument = bob.body;
    assert.notEqual(bobDocument.id, aliceDocument.id);
  });

  await t.test('rejeita arquivos acima do limite configurado', async () => {
    const { response, body } = await upload('alice', 'abcdef', 'grande.txt');
    assert.equal(response.status, 413);
    assert.equal(typeof body.error, 'string');
  });

  await t.test('lista somente metadados do dono', async () => {
    for (const [owner, expected] of [['alice', [aliceDocument]], ['bob', [bobDocument]], ['carol', []]]) {
      const response = await fetch(`${base}/documents`, { headers: { 'x-user-id': owner } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
    }
  });

  await t.test('baixa somente pelo nome físico nos metadados', async () => {
    const response = await fetch(`${base}/documents/${aliceDocument.id}/download`, {
      headers: { 'x-user-id': 'alice' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from('abcde'));

    const errors = [];
    for (const id of [aliceDocument.id, 'inexistente']) {
      const denied = await fetch(`${base}/documents/${id}/download`, {
        headers: { 'x-user-id': 'bob' },
      });
      assert.equal(denied.status, 404);
      errors.push(await denied.json());
    }
    assert.equal(typeof errors[0].error, 'string');
    assert.deepEqual(errors[0], errors[1]);
  });
});
