import DownloadButton from './DownloadButton.jsx';

export default function DocumentList({ userId, documents, loading, error }) {
  return (
    <section>
      <h2>Documentos</h2>
      {!userId && <p>Informe seu identificador para listar documentos.</p>}
      {loading && <p role="status">Carregando documentos...</p>}
      {error && <p role="alert">{error}</p>}
      {userId && !loading && !error && documents.length === 0 && (
        <p>Nenhum documento encontrado.</p>
      )}
      {userId && !loading && !error && documents.length > 0 && (
        <ul>
          {documents.map((item) => (
            <li key={item.id}>
              {item.originalName} ({item.size} bytes) —{' '}
              <DownloadButton userId={userId} document={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
