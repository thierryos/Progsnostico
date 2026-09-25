# Prognóstico — guia para o Claude Code

Jogo de cartas multiplayer de palpites, **mobile first**, React 19 + TypeScript (strict) + Vite 6 +
Tailwind 4 + Firebase Realtime Database. Site estático no GitHub Pages (`base: /Progsnostico/`),
sem servidor próprio.

## Comandos

- `npm run dev` — dev com o Firebase real do `.env` (cuidado: a lista de salas apaga salas antigas).
- `npm run dev:fake` — dev com banco falso em memória (várias abas = vários jogadores). **Use este
  para testar.**
- `npm run check` — typecheck + lint + prettier + testes + build. Rode antes de concluir qualquer
  tarefa.
- `npm run format` — Prettier (2 espaços, aspas simples, LF).

## Mapa

- `src/game/` motor de regras puro: `reduce(state, action)` (sem React/Firebase).
- `src/net/` Firebase: `firebase.ts` (ações via transação), `serialize.ts`, `fake/` (banco falso).
- `src/rooms/` controladores: `OnlineRoom` (presença, autoridade, ausência), `OfflineRoom`.
- `src/screens/`, `src/components/` interface; `src/tutorial/` roteiro + holofote; `src/i18n/` pt/en/es.
- `src/lib/router.ts` rotas (`/`, `/lobby`, `/room/CODIGO`, `/offline`, `/tutorial`); `lib/back.ts`
  botão voltar; o build gera `404.html` para as rotas funcionarem no GitHub Pages.

## Regras do projeto

- Estado do jogo só muda por `reduce`; online, só por `net/firebase.ts#dispatch`.
- Textos visíveis sempre via `t()`; chave nova nos três idiomas.
- UI pensada primeiro para 360×640; verificar com o script de screenshots.
- Comentários, docs e commits em português (conventional commits).
- Não faça push para `main` sem pedido: o push publica o site.

## Skills e agentes do projeto

| Skill (`.claude/skills`)  | Quando                                                  |
| ------------------------- | ------------------------------------------------------- |
| `prognostico-mobile-ui`   | qualquer mudança visual; tem o script de screenshots    |
| `prognostico-game-rules`  | regras, pontuação, fases, bots, tutorial                |
| `prognostico-multiplayer` | Firebase, salas, presença, reconexão                    |
| `prognostico-quality`     | padrão de código, indentação, i18n, portão de qualidade |
| `prognostico-bug-hunt`    | reproduzir e corrigir bugs                              |

Agentes (`.claude/agents`): `bug-hunter`, `mobile-ui-specialist`, `game-rules-engineer`,
`multiplayer-engineer`, `code-quality-reviewer`.
