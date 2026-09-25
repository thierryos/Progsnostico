# 🎮 Prognóstico

Jogo de cartas multiplayer de palpites (estilo "Oh Hell"/"Fodinha"), mobile first, feito com
React, TypeScript e Firebase Realtime Database. Jogue em **https://thierryos.github.io/Progsnostico/**.

## 🎯 Regras em 30 segundos

- Cada rodada distribui N cartas e vira um **trunfo**. O trunfo vence qualquer outro naipe.
- Cada jogador dá um **palpite**: quantos duelos (vazas) vai vencer.
- É obrigatório seguir o **naipe puxado** quando se tem carta dele.
- Pontos: **1 por duelo vencido + 5 de bônus** se acertar o palpite exato.
- Modos: **Clássico** (1 → máx) e **Pirâmide** (1 → máx → 1).

## ✨ Recursos

- 📱 **Mobile first**: layout em coluna para celular em pé, barra compacta para celular deitado,
  placar lateral no desktop. Toque seleciona a carta, segundo toque joga.
- 🖥️ **Bom no PC também**: a interface cresce em monitores grandes, o trunfo aparece grande na
  mesa e há atalhos (número = palpite, Enter = próximo duelo/rodada); a aba avisa "SUA VEZ".
- 🌐 **Online** com salas públicas/privadas e link direto para a sala
  (`/Progsnostico/room/CODIGO`); rotas `/lobby`, `/offline`, `/tutorial` e botão voltar do
  celular funcionando dentro do jogo.
- 🃏 **Cartas em 3D** (estilo Balatro) e **trunfo em destaque**: painel na mesa e película
  holográfica com coroa em toda carta de trunfo; dicas do que pode ser jogado e de por que
  alguém venceu o duelo — pensado para quem nunca jogou.
- 🪑 **Mesa com assentos**: cada jogador tem o seu lugar marcado, o de quem joga agora pisca e,
  no palpite, o número pedido aparece no lugar de cada um. A meta da rodada vem em palavras
  ("FALTA 1", "NA MOSCA", "EVITE VENCER") e o palpite dos oponentes vira bolinhas.
- ✨ **Efeitos de tela** (Suave, Retrô ou Desligado) em Configurações.
- 🤖 **Offline contra bots** e **tutorial interativo** (não usam rede).
- 🔁 **Reconexão**: recarregou a página? Volta para a mesma mesa. Caiu a conexão? Um bot joga
  por você até você voltar.
- 🌍 Português, inglês e espanhol.

## 🛠️ Desenvolvimento

Pré-requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env      # preencha com as credenciais do Firebase
npm run dev               # http://localhost:3000/Progsnostico/
```

| Script                                      | O que faz                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                               | Servidor de desenvolvimento (Firebase real do `.env`)                   |
| `npm run dev:fake`                          | Multiplayer **sem Firebase**: banco em memória compartilhado entre abas |
| `npm run emulator` + `npm run dev:emulator` | SDK real contra o emulador local do Firebase (Java 11+)                 |
| `npm run test:emulator`                     | Testa o adaptador e as regras (`firebase-rules.json`) no emulador       |
| `npm test`                                  | Testes (motor de regras, serialização, adaptador Firebase, layout)      |
| `npm run lint`                              | ESLint                                                                  |
| `npm run format`                            | Prettier                                                                |
| `npm run check`                             | Tudo acima + typecheck + build (o mesmo que o CI roda)                  |

> 💡 Para testar o online sem mexer no banco de produção, use `npm run dev:fake` e abra duas abas.

## 🏗️ Arquitetura

```
src/
  game/        motor de regras PURO (sem React/Firebase): engine.ts, rules.ts, bot.ts
  net/         Firebase: firebase.ts (transações), serialize.ts, fake/ (banco falso p/ testes)
  rooms/       controladores: OnlineRoom (presença, autoridade), OfflineRoom
  screens/     telas: menu, salas, sala de espera, jogo
  components/  peças visuais (mesa, mão, cartas, modais)
  tutorial/    roteiro do tutorial + holofote
  i18n/        pt, en, es
```

- **Toda ação** (`bid`, `play`, `ready`…) passa por `reduce(state, action)` em `game/engine.ts`.
  Offline, isso roda local; online, roda **dentro de uma transação** do Firebase sobre o estado
  remoto. Ações repetidas ou fora de hora viram no-op, sem race conditions.
- **Autoridade**: o primeiro humano conectado executa as jogadas dos bots e a resolução das
  vazas. Se ele sair, o próximo assume automaticamente.
- **Dados no Firebase**: `rooms/{codigo}/meta` (lista de salas), `rooms/{codigo}/game`
  (partida) e `rooms/{codigo}/presence/{jogador}`.

### Regras do Realtime Database

Veja a seção "Regras do Realtime Database" em [DEPLOY.md](DEPLOY.md): as regras recomendadas
(`firebase-rules.json`, local) incluem o índice `meta/status` + `meta/lastActivity` da lista de
salas e validam os dados gravados. Teste com `npm run test:emulator` antes de publicar.

⚠️ Sem Firebase Auth, qualquer cliente consegue ler o estado completo da partida (inclusive as
mãos). Para um jogo casual entre amigos isso é aceitável; para impedir trapaças seria preciso
Firebase Auth + regras por jogador ou um servidor autoritativo.

## 📦 Deploy

Push na `main` → GitHub Actions roda os testes e publica no GitHub Pages. Veja [DEPLOY.md](DEPLOY.md).

## 📄 Licença

MIT.
