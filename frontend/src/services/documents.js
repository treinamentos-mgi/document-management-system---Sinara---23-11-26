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
    let message;
    try {
      const data = JSON.parse(body);
      if (data && typeof data.error === 'string') message = data.error;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    throw new Error(message || `Erro na requisição (${response.status}).`);
  }

  return response;
}

function getDownloadName(disposition, originalName) {
  if (!disposition) return originalName;

  const extended = disposition.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8'[^']*'([^;]*)/i);
  if (extended) {
    try {
      return decodeURIComponent(extended[1]) || originalName;
    } catch (error) {
      if (!(error instanceof URIError)) throw error;
    }
  }

  const standard = disposition.match(/(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;]*))/i);
  return (standard?.[1]?.replace(/\\(.)/g, '$1') || standard?.[2]?.trim()) || originalName;
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
    filename: getDownloadName(response.headers.get('Content-Disposition'), document.originalName),
  };
}
