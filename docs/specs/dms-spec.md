# Especificação - Document Management System

> Fontes: `README.md`, `docs/specs/spec-template.md`,
> `.github/copilot-instructions.md`, `backend/src/app.js`,
> `frontend/vite.config.js` e `.github/steps/`. Itens sem definição nessas
> fontes ou nas decisões desta especificação estão em “Questões em aberto”.

## 1. Objetivo

Permitir o envio, a listagem e o download de documentos, com metadados associados
ao usuário dono e arquivos mantidos no filesystem local.

## 2. Escopo

### Dentro do escopo

- Upload de documentos.
- Listagem de documentos enviados.
- Download de um documento pelo identificador.
- Gestão simples por usuário, com identificador do dono nos metadados.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Versionamento de documentos.

## 3. Requisitos funcionais

| ID    | Requisito |
| ----- | --------- |
| RF-01 | O usuário pode enviar um documento. |
| RF-02 | O usuário pode listar os documentos enviados. |
| RF-03 | O usuário pode baixar um documento pelo identificador. |
| RF-04 | Os metadados de cada documento incluem o identificador do usuário dono. |

O usuário é identificado pelo cabeçalho `x-user-id`, sem autenticação. A
listagem e o download são restritos aos documentos associados ao valor desse
cabeçalho. As limitações dessa decisão estão registradas na seção 7.

## 4. Requisitos não funcionais

| ID     | Requisito |
| ------ | --------- |
| RNF-01 | Os arquivos são gravados em `backend/storage`, no filesystem local da aplicação, por meio do Multer com `diskStorage`; o armazenamento não deve usar provedores externos. |
| RNF-02 | Os metadados dos documentos são mantidos em memória nesta fase. |
| RNF-03 | A configuração da aplicação é feita por variáveis de ambiente, conforme o princípio 12-Factor. |
| RNF-04 | O nome físico do arquivo no disco é gerado pelo sistema e nunca é o valor de `originalName`. |
| RNF-05 | O download obtém o caminho local exclusivamente dos metadados armazenados; não deriva o caminho do identificador recebido nem do nome original. |
| RNF-06 | O tamanho máximo do upload é configurado por `MAX_UPLOAD_SIZE_BYTES`, com padrão de `10485760` bytes; uploads que excedem o limite retornam `413 Payload Too Large`. |

## 5. Modelo de dados (metadados do documento)

| Campo        | Tipo   | Descrição |
| ------------ | ------ | --------- |
| `id` | string | Identificador único do documento, usado para localizá-lo. |
| `originalName` | string | Nome original do arquivo enviado. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload no formato ISO 8601. |
| `owner` | string | Identificador do usuário dono do documento. |
| `storedName` | string | Nome do arquivo gerado pelo sistema no disco. Dado interno usado para localizar o arquivo, não exposto como metadado da API. |

O `storedName` é mantido junto aos metadados internos para resolver o caminho de
download. As respostas da API expõem os campos públicos (`id`, `originalName`,
`size`, `uploadedAt` e `owner`), não o nome físico nem o caminho local.

## 6. Contratos de API

Os caminhos são rotas do backend e não incluem `/api`. No desenvolvimento, o
frontend usa o prefixo `/api`; o proxy do Vite remove esse prefixo antes de
encaminhar a chamada. Todas as operações por usuário recebem o cabeçalho
`x-user-id`, cujo valor identifica o dono, mas não é autenticado.

As respostas de erro definidas nesta especificação usam o formato:

```json
{ "error": "mensagem" }
```

### `POST /upload`

- **Cabeçalhos:** `x-user-id`.
- **Entrada:** arquivo no campo `file` de `multipart/form-data`.
- **Sucesso:** `201 Created`, com os metadados públicos do documento criado.
- **Erros definidos:** `400 Bad Request` quando o arquivo não foi enviado ou
  quando `x-user-id` está ausente ou vazio; `413 Payload Too Large` quando o
  arquivo excede `MAX_UPLOAD_SIZE_BYTES`. As respostas usam o formato de erro
  acima.

### `GET /documents`

- **Cabeçalhos:** `x-user-id`.
- **Sucesso:** `200 OK`, com a lista dos metadados públicos pertencentes ao
  usuário identificado pelo cabeçalho.
- **Erro definido:** `400 Bad Request` quando `x-user-id` está ausente ou
  vazio, com o formato de erro acima.

### `GET /documents/:id/download`

- **Cabeçalhos:** `x-user-id`.
- **Entrada:** `id` do documento no caminho.
- **Sucesso:** `200 OK`, com o conteúdo binário do arquivo, somente se o
  documento pertencer ao usuário identificado pelo cabeçalho.
- **Erros definidos:** `400 Bad Request` quando `x-user-id` está ausente ou
  vazio; `404 Not Found` quando o identificador não existe ou quando o
  documento pertence a outro usuário. Também retorna `404 Not Found`, com
  `{ "error": "Documento não encontrado." }`, quando os metadados existem,
  mas o arquivo não existe no disco; nesse caso, o erro é registrado no console.
  Retornar o mesmo status para identificador inexistente e documento de outro
  usuário evita revelar a existência de documentos de terceiros. As respostas
  usam o formato de erro acima.
- **Resolução do arquivo:** localizar os metadados pelo identificador e obter
  deles o nome físico gerado pelo sistema; não montar um caminho a partir de
  `:id` ou de `originalName`.

## 7. Decisões arquiteturais

- **Stack:** backend Node.js com Express e CommonJS; frontend React + Vite com
  JavaScript ESM; testes de backend com `node:test`; JavaScript puro, sem
  TypeScript nesta fase.
- **Backend:** Clean Architecture simples, organizada em `routes`,
  `controllers`, `services` e `repositories`, com dependências no sentido
  `routes -> controllers -> services -> repositories`.
- **Frontend:** componentes funcionais com React Hooks e organização em
  `frontend/src/components`, `frontend/src/pages` e
  `frontend/src/services`. A comunicação com a API usa `fetch` pelo prefixo
  `/api`. O usuário informa seu identificador na página; sem ele, o envio e a
  listagem ficam desabilitados. O download usa `originalName` como nome do arquivo.
- **Proxy e caminhos:** `frontend/vite.config.js` encaminha `/api` ao backend
  local e remove esse prefixo. Portanto, as rotas do backend são `/upload`,
  `/documents` e `/documents/:id/download`, sem `/api`.
- **Porta:** o backend lê `PORT` do ambiente e usa `3000` quando a variável não
  está definida. O proxy de desenvolvimento do Vite usa `BACKEND_URL` como
  destino, com `http://localhost:3000` como padrão.
- **Identidade e acesso:** o valor de `x-user-id` identifica o dono; não há
  autenticação. Listagem e download filtram pelo dono. Como o cabeçalho não é
  autenticado, ele não comprova a identidade e não deve ser tratado como uma
  barreira de segurança para implantação exposta a usuários não confiáveis.
- **Upload:** o campo multipart é `file`; o tamanho máximo é configurado por
  `MAX_UPLOAD_SIZE_BYTES`, com padrão de `10485760` bytes. Ausência de arquivo
  ou `x-user-id` ausente/vazio retorna `400`; arquivo acima do limite retorna
  `413`.
- **Armazenamento:** arquivos locais em `backend/storage`, por Multer com
  `diskStorage`; metadados em memória. O nome físico é gerado pelo sistema e o
  download resolve o arquivo somente por metadados armazenados, mantendo o
  caminho dentro do diretório de storage. Se o arquivo não existir no disco,
  retorna `404` com `{ "error": "Documento não encontrado." }` e registra o erro.
- **Respostas:** upload bem-sucedido retorna `201`; listagem e download
  bem-sucedidos retornam `200`; arquivo ou `x-user-id` ausente/vazio retorna
  `400`; upload acima do limite retorna `413`; identificador inexistente ou
  documento de outro usuário retorna `404`; arquivo ausente no disco também
  retorna `404`. As respostas de erro usam `{ "error": "mensagem" }`.

## 8. Plano de execução

Etapas de implementação do projeto.

1. **Planejamento da especificação**
   - **Arquivos:** `docs/specs/dms-spec.md`.
   - **Critérios de aceite:** requisitos, modelo de dados, contratos,
     decisões e questões em aberto documentados antes de iniciar a
     implementação.
2. **Backend**
   - **Arquivos:** `backend/src/app.js`, `backend/src/routes/`,
     `backend/src/controllers/`, `backend/src/services/`,
     `backend/src/repositories/`, `backend/test/` e o diretório de runtime
     `backend/storage/`.
   - **Critérios de aceite:** `POST /upload` aceita o campo `file`, associa o
     documento ao `x-user-id`, gera nome físico que não usa `originalName` e
     retorna `201`; arquivo ausente ou `x-user-id` ausente/vazio retorna `400`,
     e arquivo acima do limite configurado retorna `413`. `GET /documents`
     retorna `200` somente com documentos do dono. `GET /documents/:id/download`
     retorna `200` para arquivo do dono, usa o nome físico dos metadados para
     localizar o arquivo e retorna o mesmo `404` para id inexistente ou
     documento de outro usuário. Erros seguem o formato definido e os testes
     `node:test` passam.
3. **Frontend**
   - **Arquivos:** `frontend/src/components/UploadComponent.jsx`,
     `frontend/src/components/DocumentList.jsx`,
     `frontend/src/components/DownloadButton.jsx`, página em
     `frontend/src/pages/`, `frontend/src/App.jsx` e cliente de API em
     `frontend/src/services/`.
   - **Critérios de aceite:** componentes funcionais usam Hooks; upload,
     listagem e download consomem as rotas através de `fetch` com `/api` e
     enviam `x-user-id`; o proxy remove `/api` e as três jornadas funcionam
     pela interface.
4. **Revisão e refatoração**
   - **Arquivos:** `backend/src/`, `backend/test/` e `frontend/src/`.
   - **Critérios de aceite:** responsabilidades permanecem nas camadas
     previstas, duplicações e problemas identificados na revisão são
     tratados sem quebrar os fluxos, e os testes de backend continuam
     passando.
5. **Automação e validação final**
   - **Arquivos:** `.github/workflows/ci.yml`, `backend/test/`,
     `backend/package.json` e `frontend/package.json`.
   - **Critérios de aceite:** CI instala dependências, executa `npm test` no
     backend e builda o frontend; a validação ponta a ponta confirma que um
     arquivo enviado aparece na lista do dono e pode ser baixado.

## 9. Questões em aberto

- Quais tipos de arquivo e demais regras de validação são aceitos?
- Quais códigos de erro se aplicam a falhas diferentes das já definidas
  (arquivo não enviado ou ausente no disco, cabeçalho ausente/vazio, limite
  excedido e identificador inexistente/documento de outro usuário)?
- A listagem terá ordenação, paginação ou filtragem?

## 10. Riscos conhecidos

- O cabeçalho `x-user-id` não é autenticado e permite impersonar outros usuários.
- O storage não possui limite agregado e pode crescer indefinidamente.
- Os metadados em memória são perdidos ao reiniciar a aplicação.
