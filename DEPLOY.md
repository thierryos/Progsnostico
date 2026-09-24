# 🚀 Deploy no GitHub Pages

## 1. Secrets do repositório

Em **Settings → Secrets and variables → Actions**, crie:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

> A configuração web do Firebase vai para o JavaScript público do site, então ela **não é
> segredo**. A proteção real do banco são as **regras do Realtime Database**.

## 2. GitHub Pages

O workflow publica o conteúdo de `dist/` no branch `gh-pages` (via `peaceiris/actions-gh-pages`).
Em **Settings → Pages**, a origem deve ser **Deploy from a branch → `gh-pages` / root**.

## 3. Regras do Realtime Database

As regras recomendadas ficam em `firebase-rules.json` (arquivo local, ignorado pelo git). Elas:
negam tudo fora de `rooms`, exigem código de sala válido, validam os campos de `meta`, `game` e
`presence`, e criam o índice `meta/status` + `meta/lastActivity` usado pela lista de salas.

1. **Teste antes** (Java 11+): `npm run test:emulator` — sobe o emulador com essas regras e roda o
   adaptador real contra ele.
2. **Publique**: Firebase Console → Realtime Database → **Regras** → cole o conteúdo de
   `firebase-rules.json` → **Publicar** (ou `npx firebase-tools deploy --only database`).
3. Faça isso **antes** de publicar o site novo: as regras antigas podem recusar os caminhos
   `rooms/{codigo}/meta|game|presence`.

## 4. Publicar

Qualquer push na `main` dispara `.github/workflows/deploy.yml`:

1. `check`: typecheck, lint, formatação e testes (também roda em pull requests);
2. `deploy`: build com os secrets e publicação.

Deploy manual (da sua máquina): `npm run deploy`.

## Notas

- `base` em `vite.config.ts` precisa ser igual ao nome do repositório (`/Progsnostico/`).
- Salas sem atividade por 10 minutos são apagadas por qualquer cliente que abrir a lista de salas.
  Isso inclui salas no formato antigo (de antes da v1.0), então partidas abertas em versões antigas
  terminam no primeiro acesso à versão nova.
- Sem o `.indexOn`, o jogo funciona, mas baixa todas as salas a cada mudança na lista.

## Problemas comuns

| Sintoma                             | Causa provável                                               |
| ----------------------------------- | ------------------------------------------------------------ |
| Página em branco                    | `base` do Vite diferente do nome do repositório              |
| "Modo online indisponível"          | Secrets ausentes no build, ou regras do banco negando acesso |
| Aviso "Using an unspecified index"  | Falta o `.indexOn` nas regras                                |
| "Cota excedida ou permissão negada" | Regras antigas ou não publicadas (ver seção 3)               |
