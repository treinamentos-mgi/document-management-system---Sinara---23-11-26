import { useState } from 'react';
import { downloadDocument } from '../services/documents.js';

export default function DownloadButton({ userId, document: item }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setError('');
    let url;
    try {
      const { blob, filename } = await downloadDocument(userId, item);
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
    } catch (error) {
      setError(error.message);
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleDownload} disabled={!userId || downloading}>
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
  );
}
