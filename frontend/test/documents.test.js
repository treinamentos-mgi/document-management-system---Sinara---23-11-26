import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/documents.js';

test('upload envia arquivo e identificador sem definir Content-Type', async (t) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ id: '1' }, { status: 201 }));
  t.after(() => fetchMock.mock.restore());
  const file = new File(['conteúdo'], 'teste.txt', { type: 'text/plain' });

  assert.deepEqual(await uploadDocument('usuario', file), { id: '1' });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/upload');
  assert.equal(options.method, 'POST');
  assert.deepEqual(options.headers, { 'x-user-id': 'usuario' });
  assert.equal(options.body.get('file'), file);
});

test('listagem envia identificador e sinal de cancelamento', async (t) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json([{ id: '1' }]));
  t.after(() => fetchMock.mock.restore());
  const signal = new AbortController().signal;

  assert.deepEqual(await listDocuments('usuario', signal), [{ id: '1' }]);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents');
  assert.equal(options.headers['x-user-id'], 'usuario');
  assert.equal(options.signal, signal);
});

test('download usa blob e nome do cabeçalho, com alternativa para originalName', async (t) => {
  const responses = [
    new Response('arquivo', { headers: { 'Content-Disposition': "attachment; filename=\"fallback.txt\"; filename*=UTF-8''relat%C3%B3rio.txt" } }),
    new Response('arquivo', { headers: { 'Content-Disposition': 'attachment; filename="nome; teste.txt"' } }),
    new Response('arquivo'),
  ];
  const fetchMock = mock.method(globalThis, 'fetch', async () => responses.shift());
  t.after(() => fetchMock.mock.restore());
  const item = { id: 'a/b', originalName: 'original.txt' };

  const first = await downloadDocument('usuario', item);
  assert.equal(first.filename, 'relatório.txt');
  assert.equal(await first.blob.text(), 'arquivo');
  assert.equal((await downloadDocument('usuario', item)).filename, 'nome; teste.txt');
  assert.equal((await downloadDocument('usuario', item)).filename, 'original.txt');
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents/a%2Fb/download');
  assert.equal(options.headers['x-user-id'], 'usuario');
});

test('erros da API e falhas de conexão são exibidos', async (t) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Documento não encontrado.' }, { status: 404 }));
  t.after(() => fetchMock.mock.restore());

  await assert.rejects(downloadDocument('usuario', { id: '1' }), { message: 'Documento não encontrado.' });
  fetchMock.mock.mockImplementation(async () => new Response('erro', { status: 500 }));
  await assert.rejects(listDocuments('usuario'), { message: 'Erro na requisição (500).' });
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(listDocuments('usuario'), { message: 'Não foi possível conectar à API.' });
});
