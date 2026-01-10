# Firebase Realtime Database - Regras de Segurança

## Visão Geral
Estas regras fornecem segurança robusta para o banco de dados do jogo Prognostico, garantindo integridade dos dados e prevenindo abusos.

## Estrutura das Regras

### Leitura (Read)
- ✅ **Público**: Qualquer usuário pode listar e visualizar salas abertas
- 📊 **Indexação**: Otimizado para buscar por status e data de criação

### Escrita (Write)
- ✅ **Criar sala**: Qualquer um pode criar uma nova sala
- 🔒 **Modificar sala**: Apenas o host original pode modificar (via `hostId`)
- ⚡ **Fallback**: Se `hostId` não existir, permite escrita (para compatibilidade)

## Validações de Segurança

### Campos Obrigatórios
Toda sala deve ter:
- `status`: Estado atual do jogo
- `players`: Lista de jogadores
- `currentRoom`: Configuração da sala

### Validações por Campo

#### `status`
Valores permitidos:
- `menu`, `room_browser`, `waiting_room`
- `bidding`, `playing`, `trick_summary`
- `round_end`, `game_over`

#### `currentRoom.maxPlayers`
- Tipo: Número
- Mínimo: 2 jogadores
- Máximo: 7 jogadores

#### `currentRoom.name`
- Tipo: String
- Mínimo: 1 caractere
- Máximo: 50 caracteres

#### `currentRoom.gameMode`
- Valores: `up` ou `up_down`

#### `currentRoom.maxHandSize`
- Tipo: Número
- Mínimo: 0
- Máximo: 13 (tamanho máximo de mão)

#### `round`
- Tipo: Número
- Mínimo: 0
- Máximo: 13 cartas

#### `totalRounds`
- Tipo: Número
- Mínimo: 0
- Máximo: 26 (máximo de rodadas possíveis)

### Campos de Controle

#### `hostId`
- Identifica quem criou a sala
- Usado para controle de permissões
- String obrigatória

#### `createdAt` e `lastActivity`
- Timestamps em milissegundos
- Permitem limpeza de salas inativas
- Útil para analytics

## Segurança Implementada

### ✅ Prevenção de Injeção
- Todos os campos têm validação de tipo
- Strings têm limite de tamanho
- Números têm ranges definidos

### ✅ Controle de Acesso
- Apenas host pode modificar a sala
- Previne modificações não autorizadas
- Fallback seguro para salas antigas

### ✅ Integridade de Dados
- Estrutura validada
- Estados válidos definidos
- Previne dados corrompidos

### ✅ Performance
- Indexação em campos de busca
- Otimizado para listagem de salas
- Queries eficientes

## Como Aplicar

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto: **prognostico-game**
3. Vá em: **Realtime Database** → **Regras**
4. Cole o conteúdo de `firebase-rules.json`
5. Clique em **Publicar**

## Testando as Regras

### Teste de Criação
```javascript
// ✅ Deve funcionar
firebase.database().ref('rooms/ABC123').set({
  status: 'waiting_room',
  players: [...],
  currentRoom: {
    id: 'ABC123',
    name: 'Minha Sala',
    maxPlayers: 4,
    status: 'open',
    gameMode: 'up',
    maxHandSize: 7
  },
  hostId: 'player-123',
  createdAt: Date.now()
});
```

### Teste de Modificação Autorizada
```javascript
// ✅ Funciona se você é o host
firebase.database().ref('rooms/ABC123/status').set('playing');
```

### Teste de Modificação Não Autorizada
```javascript
// ❌ Falha se você não é o host
firebase.database().ref('rooms/XYZ789/status').set('playing');
// Error: PERMISSION_DENIED
```

## Manutenção

### Limpeza Automática (Recomendado)
Implemente uma Cloud Function para remover salas inativas:

```javascript
// Firebase Cloud Function (exemplo)
exports.cleanupOldRooms = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 horas
    
    const snapshot = await admin.database()
      .ref('rooms')
      .orderByChild('lastActivity')
      .endAt(cutoff)
      .once('value');
    
    const updates = {};
    snapshot.forEach(child => {
      updates[child.key] = null;
    });
    
    return admin.database().ref('rooms').update(updates);
  });
```

## Notas de Segurança

⚠️ **Importante**:
- Não armazene senhas em texto plano (já implementado com hash)
- O `hostId` deve ser único por jogador
- Monitore o uso do banco para detectar abusos
- Considere rate limiting via Cloud Functions

## Suporte

Para questões sobre as regras de segurança:
1. Verifique os logs no Firebase Console
2. Use o simulador de regras no console
3. Teste em ambiente de desenvolvimento primeiro
