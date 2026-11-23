async function request(path, userId, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { ...options.headers, 'x-user-id': userId },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Não foi possível conectar à API.');
  }

  if (!response.ok) {
    const body = await response.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error(`Erro na requisição (${response.status}).`);
    }
    const message = data && typeof data.error === 'string' ? data.error : '';
    throw new Error(message || `Erro na requisição (${response.status}).`);
  }

  return response;
}

export async function uploadDocument(userId, file) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, { method: 'POST', body });
  return response.json();
}

export async function listDocuments(userId, signal) {
  const response = await request('/documents', userId, { signal });
  return response.json();
}

export async function downloadDocument(userId, document) {
  const response = await request(`/documents/${encodeURIComponent(document.id)}/download`, userId);
  return {
    blob: await response.blob(),
    filename: document.originalName,
  };
}
