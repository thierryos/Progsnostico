---
name: prognostico-multiplayer
description: Arquitetura e armadilhas do multiplayer do Prognóstico sobre Firebase Realtime Database (src/net, src/rooms). Use ao mexer em salas, entrada/saída, presença, reconexão, autoridade/host, lista de salas, regras do banco ou quando houver dessincronização, jogo travado, ação duplicada ou "sala sumiu".
---

# Multiplayer (Firebase RTDB) — Prognóstico

Sem servidor próprio: o site é estático no GitHub Pages e o Firebase é o único backend.
(Colyseus/servidor autoritativo foi avaliado e **descartado** para manter o deploy estático.)

## Dados

```
rooms/{CODIGO}/meta                 nome, status (open|playing|finished), playerCount,
                                    maxPlayers, gameMode, isPrivate, passwordHash, lastActivity
rooms/{CODIGO}/game                 GameState completo (fonte da verdade)
rooms/{CODIGO}/presence/{playerId}  true enquanto conectado (onDisconnect remove)
```

- A lista de salas consulta **só** `meta` (`orderByChild('meta/status')`). Precisa de
  `".indexOn": ["meta/status", "meta/lastActivity"]` em `rooms` nas regras do banco.
- Regras recomendadas: `firebase-rules.json` (local, fora do git). Qualquer campo novo em `meta`,
  filho novo em `rooms/{id}` ou novo formato de código de sala exige atualizar as regras.
- Leitura única de consulta: use `readOnce` (onValue + onlyOnce), nunca `get()` em consulta.
- Salas sem atividade por 10 min são apagadas por `cleanupStaleRooms` (inclui formato antigo).

## Fluxo de uma ação

`dispatch(roomId, action)` em `net/firebase.ts`:
`runTransaction(rooms/X/game, raw => serialize(reduce(deserialize(raw), action)))`.
- Retornar `undefined` aborta (ação no-op). `raw === null` na 1ª chamada é normal (cache vazio).
- `GameRuleError` dentro da transação é capturado e relançado depois (sala cheia etc.).
- Depois do commit, `meta` é atualizado (não atômico, só serve para a lista).

**Nunca** escreva em `rooms/X/game` com `set/update` direto: sempre via `dispatch`, senão volta a
race condition que o projeto antigo tinha.

## Autoridade, presença e ausência (`rooms/OnlineRoom.tsx`)

- **Autoridade** = primeiro humano (não bot, não ausente) presente em `presence`
  (`getAuthorityId`). Só ela roda o driver (bots + `resolveTrick`), o heartbeat e o monitor de
  ausência. Duas autoridades momentâneas são inofensivas porque o motor é idempotente.
- **Ausente**: humano fora de `presence` por 30 s → `setAway(true)`; na sala de espera ele é
  removido, na partida um bot joga por ele. Ao voltar, o próprio cliente envia `setAway(false)`.
- **Rotas**: a sala vive em `/room/CODIGO` (`lib/router.ts`). Abrir ou recarregar esse endereço
  chama `resumeRoom` (volta para a cadeira) ou, se a pessoa não é membro, entra pelo fluxo normal
  (senha, sala cheia…). `sessionStorage` guarda só `prog.playerId` (identidade por aba).
- **Voltar do navegador** na sala de espera chama `leaveRoom` (senão fica um jogador "fantasma").
- `trackPresence` usa `.info/connected` para regravar a presença a cada reconexão.

## Serialização (`net/serialize.ts`)

O RTDB apaga `null`/`[]` e pode devolver arrays como objetos `{0:…,1:…}`. `deserializeGame`
reconstrói tudo com defaults; `serializeGame` remove `undefined` (que o SDK rejeita). Campo novo no
estado = default novo aqui + caso no `serialize.test.ts`.

## Como testar sem tocar a produção

- **Unitário**: `src/net/firebase.test.ts` usa o banco falso (`src/net/fake/database.ts`) via
  `vi.mock('firebase/database', …)`. Simule dois clientes chamando `net.dispatch` em paralelo.
- **No navegador**: `npm run dev:fake` troca o SDK pelo banco falso (alias no `vite.config.ts`,
  env em `.env.fakedb`). Abas do mesmo navegador compartilham o banco via BroadcastChannel —
  abra duas abas para simular dois jogadores, ou use o fluxo `online` do script de screenshots
  (skill `prognostico-mobile-ui`).
- Se o banco falso não suportar uma API nova do SDK, implemente-a lá (mesma assinatura).
- **SDK real + regras**: `npm run test:emulator` (Java 11+) roda `src/net/firebase.emulator.test.ts`
  contra o emulador com `firebase-rules.json`. No navegador: `npm run emulator` e
  `npm run dev:emulator`. O banco falso já escondeu um bug real (`get()` de consulta sem índice
  volta vazio) — mudança em consulta, transação ou regra **precisa** passar no emulador.
- O emulador aplica as regras ao namespace `demo-prognostico-default-rtdb`.

## Segurança (limites conhecidos)

Sem Firebase Auth, qualquer cliente lê o estado (inclusive as mãos) e pode escrever na sala. A
senha da sala é só um hash (cyrb53) para não ficar em texto puro. Endurecer exige Firebase Auth
anônimo + regras por `auth.uid` — trate como projeto à parte e peça confirmação antes.
