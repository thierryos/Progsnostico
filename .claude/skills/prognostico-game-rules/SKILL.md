---
name: prognostico-game-rules
description: Como alterar as regras, a pontuação, os bots ou o fluxo de fases do Prognóstico com segurança no motor puro (src/game). Use ao mexer em engine.ts, rules.ts, bot.ts, cards.ts, selectors.ts ou no roteiro do tutorial, ou quando uma regra do jogo estiver errada (vencedor da vaza, seguir naipe, pontos, ordem de turno, rodadas).
---

# Motor de regras — Prognóstico

## Arquitetura

`src/game/` é **puro**: sem React, sem Firebase, sem `Date.now()`/`Math.random()` direto
(aleatoriedade entra por `EngineContext.random`). Tudo passa por:

```ts
reduce(state: GameState, action: GameAction, ctx?: EngineContext): GameState
```

O mesmo `reduce` roda no modo offline, no tutorial e **dentro de transações do Firebase**
(`net/firebase.ts#dispatch`). Por isso:

- **Ação inválida → devolva o MESMO objeto `state`** (fora de turno, carta ilegal, ação repetida,
  fase errada). No online isso aborta a transação. Nunca lance erro para esses casos.
- **Erro que o jogador precisa ver** (sala cheia, partida iniciada) → `throw new GameRuleError(code)`
  e adicione `err_<code>` nos três dicionários de `src/i18n`.
- **Idempotência**: aplicar a mesma ação duas vezes não pode mudar o resultado (dois clientes
  podem mandar `resolveTrick` ao mesmo tempo). Cubra com teste.
- Nunca mute o estado recebido; use spreads/`map` (o helper `updatePlayer` preserva a referência
  quando nada muda).

## Fases

`lobby → bidding → playing → (vaza completa) → trick_summary → playing … → round_end → bidding …
→ game_over`

- `play` completando a vaza deixa `currentTurn = ''`; quem resolve é o **driver**
  (`hooks/useGameDriver.ts`, só no cliente com autoridade) enviando `resolveTrick` após 900 ms.
- `trick_summary`/`round_end` avançam quando **todos** estão `isReady` (bots e ausentes ficam
  prontos automaticamente) — lógica em `maybeAdvance`.
- Bots e jogadores ausentes (`isAutomated`) jogam via `botMove`, também disparado pelo driver.

## Regras atuais (não mude sem pedido explícito)

- Seguir o naipe puxado é obrigatório; trunfo > naipe puxado > descarte (`rules.ts`).
- Pontos: 1 por vaza + 5 se `vazas === palpite` (`scoreRound`).
- Rodadas: `roundSequence(n, modo, limite)`; máximo `floor(52/n)` cartas; quando o baralho acaba
  exatamente, a rodada fica **sem trunfo** (comportamento intencional).
- Quem começa gira a cada rodada; quem vence a vaza puxa a próxima.
- O host é o primeiro humano da lista (`getHostId`); ele não precisa marcar "pronto".

## Checklist para qualquer mudança

1. Escreva/ajuste o teste primeiro em `src/game/engine.test.ts` (use `seeded()` para RNG
   determinístico e `autoPlay()` para simular partidas inteiras com invariantes).
2. Se mexer no fluxo de fases ou em ids de carta, rode `src/tutorial/script.test.ts` — o tutorial
   usa o motor real e precisa terminar 7 × 6.
3. Se adicionar campo ao `GameState`/`Player`, atualize `net/serialize.ts` (defaults para campos
   ausentes — o Firebase apaga `null` e arrays vazios) e o teste de serialização.
4. Se adicionar `GameAction`, trate no `switch` do `reduce` e decida quem a envia (jogador ou
   driver). Ações do sistema precisam ser idempotentes.
5. Rode `npm run check`.
