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
- **Recarregar a página**: `sessionStorage` guarda `prog.playerId` e `prog.room`;
  `App.tsx` chama `resumeRoom` e volta para a mesa.
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

## Segurança (limites conhecidos)

Sem Firebase Auth, qualquer cliente lê o estado (inclusive as mãos) e pode escrever na sala. A
senha da sala é só um hash (cyrb53) para não ficar em texto puro. Endurecer exige Firebase Auth
anônimo + regras por `auth.uid` — trate como projeto à parte e peça confirmação antes.
