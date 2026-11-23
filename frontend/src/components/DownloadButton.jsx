import { useState } from 'react';
import { downloadDocument } from '../services/documents.js';

export default function DownloadButton({ userId, document: item }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await downloadDocument(userId, item);
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      setError(error.message);
    } finally {
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
