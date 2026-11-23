import { useEffect, useState } from 'react';
import DocumentList from '../components/DocumentList.jsx';
import UploadComponent from '../components/UploadComponent.jsx';
import { listDocuments } from '../services/documents.js';

function UserDocuments({ userId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!userId) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError('');
    listDocuments(userId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [userId, version]);

  return (
    <>
      <UploadComponent userId={userId} onUpload={() => setVersion((value) => value + 1)} />
      <DocumentList userId={userId} documents={documents} loading={loading} error={error} />
    </>
  );
}

export default function DocumentsPage() {
  const [identifier, setIdentifier] = useState('');
  const userId = identifier.trim();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Gestão de documentos</h1>
      <label htmlFor="user-id">Identificador do usuário</label>{' '}
      <input
        id="user-id"
        type="text"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
      />
      <UserDocuments key={userId} userId={userId} />
    </main>
  );
}
