---
name: prognostico-bug-hunt
description: Roteiro para caçar, reproduzir e corrigir bugs no Prognóstico (jogo travado, pontuação errada, carta inválida aceita, estado dessincronizado entre jogadores, tela quebrada, tutorial preso). Use quando alguém relatar um bug, pedir uma auditoria de bugs, ou antes de um release.
---

# Caça a bugs — Prognóstico

## Método (não pule etapas)

1. **Localize a camada** pelo sintoma:
   | Sintoma | Onde olhar |
   | --- | --- |
   | regra/pontuação/turno errado | `src/game/engine.ts`, `rules.ts`, `bot.ts` |
   | trava ou dessincroniza só online | `src/net/firebase.ts`, `src/rooms/OnlineRoom.tsx`, `hooks/useGameDriver.ts` |
   | dado "some" ou vem estranho do banco | `src/net/serialize.ts` |
   | visual/toque/tamanho | `src/components/**`, `src/screens/**` (skill `prognostico-mobile-ui`) |
   | tutorial preso | `src/tutorial/script.ts`, `TutorialRoom.tsx`, ids dos elementos |
2. **Reproduza com um teste que falha** antes de mudar código:
   - regra → `engine.test.ts` (`seeded()`, `autoPlay()`, `playAsBot()`);
   - sync/concorrência → `firebase.test.ts` (dois `net.dispatch` com `Promise.all`);
   - geometria → `tableLayout.test.ts`;
   - fluxo de tela → script `screenshots.py` da skill `prognostico-mobile-ui` com `npm run dev:fake`.
3. **Corrija a causa**, não o sintoma. Prefira mudar o motor puro a colocar "gambiarras" na UI.
4. **Rode `npm run check`** e, se tocou UI, o script de screenshots.
5. Reporte: causa raiz, como reproduzir, o que mudou, qual teste cobre.

## Classes de bug que este projeto já teve (verifique sempre)

- **Closure velha em `setTimeout`/efeitos** lendo `gameState` antigo → ações com dados errados.
  Hoje: timers só no driver, que despacha ações validadas pelo motor.
- **Ação do sistema executada duas vezes** (anúncio de vaza em dobro, `tricksWon` +2). Toda ação
  do sistema precisa ser idempotente no `reduce`.
- **Escrita não transacional** no Firebase sobrescrevendo jogada de outro jogador.
- **Firebase apagando `null`/`[]`** e devolvendo arrays como objetos.
- **Entrar em partida em andamento** quebrando `tableCards.length === players.length`.
- **Host fecha a aba e o jogo trava** (automação dependia de um cliente fixo).
- **Rótulo errado**: "rodada" mostrando nº de cartas em vez de índice da rodada.
- **Texto fixo em português** em telas que deveriam trocar de idioma.
- **Hover como única forma de ver informação** (não existe no celular).
- **Modal cobrindo o que o jogador precisa ver** (o palpite cobria a mão).
- **Loop infinito** com `players.length === 0` em `floor(52 / n)`.

## Ferramentas úteis

- `npm run test:watch` enquanto investiga.
- Estado do banco falso nos testes: `__fake.dump()`; simular queda: `__fake.disconnectAll()`.
- No navegador (dev:fake), duas abas = dois jogadores; recarregar uma testa a reconexão.
- **Nunca** reproduza bugs contra o Firebase de produção (a lista de salas apaga salas antigas).
