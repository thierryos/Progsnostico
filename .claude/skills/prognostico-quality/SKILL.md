---
name: prognostico-quality
description: Padrão de código, formatação/indentação, i18n e portão de qualidade do Prognóstico. Use antes de concluir qualquer alteração de código, ao refatorar, ao revisar um diff, ou quando pedirem para "arrumar indentação", "limpar código", "padronizar" ou "rodar os checks".
---

# Qualidade de código — Prognóstico

## Portão (rode sempre antes de dizer que terminou)

```bash
npm run check   # typecheck + lint + prettier --check + vitest + build
```

- Formatação/indentação: `npm run format` (Prettier: 2 espaços, aspas simples, ponto e vírgula,
  vírgula final, 100 colunas, LF). `.editorconfig` e `.gitattributes` garantem LF no Windows.
- Lint: `npm run lint` (ESLint + typescript-eslint + react-hooks). `exhaustive-deps` é aviso:
  não silencie — corrija a dependência ou explique no código.
- Tipos: `strict`, `noUnusedLocals`, `noUnusedParameters`. Sem `any` fora de `src/net/fake/`.

## Convenções

- Componentes funcionais com `export const Nome = (…) => …`; props tipadas por `interface`.
- Imports relativos; tipos com `import type`.
- Comentários e docs em **português**, curtos, explicando o *porquê* (não o óbvio).
- Nada de `console.log` (só `console.warn/error` em caminhos de erro).
- Textos visíveis sempre via `t('chave')`; chave nova entra em `pt.ts`, `en.ts` e `es.ts` (os dois
  últimos são `Record<TranslationKey, string>`, então o TypeScript acusa o que faltar).
- Estado do jogo só muda via `reduce` (skill `prognostico-game-rules`); rede só via `net/`
  (skill `prognostico-multiplayer`); UI segue a skill `prognostico-mobile-ui`.
- Armazenamento local só via `lib/storage.ts` (nunca `localStorage` direto — pode lançar erro).

## Testes

| Área               | Arquivo                                   |
| ------------------ | ----------------------------------------- |
| Regras e fases     | `src/game/engine.test.ts`                 |
| Tutorial           | `src/tutorial/script.test.ts`             |
| Firebase/sync      | `src/net/firebase.test.ts` (banco falso)  |
| Serialização RTDB  | `src/net/serialize.test.ts`               |
| Geometria da mesa  | `src/components/game/tableLayout.test.ts` |

Bug corrigido = teste que falhava antes da correção.

## Commits

Conventional commits em português, como no histórico: `fix: …`, `feat: …`, `refactor: …`,
`test: …`, `docs: …`. Um assunto por commit. Não faça push para a `main` sem pedido: o push
dispara o deploy no GitHub Pages.
