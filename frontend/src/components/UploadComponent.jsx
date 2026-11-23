import { useState } from 'react';
import { uploadDocument } from '../services/documents.js';

export default function UploadComponent({ userId, onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!userId || !file || uploading) return;

    const form = event.currentTarget;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      await uploadDocument(userId, file);
      form.reset();
      setFile(null);
      setSuccess('Documento enviado com sucesso.');
      onUpload();
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      <h2>Enviar documento</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="document-file">Arquivo</label>{' '}
        <input
          id="document-file"
          type="file"
          disabled={!userId || uploading}
          onChange={(event) => setFile(event.target.files[0] || null)}
        />{' '}
        <button type="submit" disabled={!userId || !file || uploading}>
          {uploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
