# Sistema de Limpeza de Salas Inativas

## ✅ Implementado

### 1. Limpeza Automática no Frontend

**Quando acontece:**
- Ao abrir o lobby (RoomBrowser)
- Automaticamente ao listar salas

**Critério:**
- Salas com mais de **30 minutos** de inatividade são deletadas

**Como funciona:**
```typescript
// Em firebase.ts
export const cleanupInactiveRooms = async () => {
  // Remove salas com lastActivity > 30 minutos
}

// Em listOpenRooms()
// Também remove salas inativas automaticamente ao listar
```

### 2. Regras do Firebase Simplificadas

**Permissões:**
- ✅ Leitura: Pública (qualquer um pode listar salas)
- ✅ Escrita: Pública (permite criar/atualizar/deletar)
- ✅ Validação: Estrutura de dados validada

**Arquivo:** `firebase-rules.json`

### 3. Cloud Functions (Opcional)

**Arquivo:** `firebase-functions.js`

Oferece limpeza automática em background:

#### a) `cleanupInactiveRooms` 
- Executa: **A cada 15 minutos**
- Remove: Salas com mais de 30 minutos de inatividade

#### b) `cleanupEmptyRooms`
- Executa: **A cada 1 hora**
- Remove: Salas sem jogadores

#### c) `manualCleanup` (Webhook)
- URL: `https://YOUR-PROJECT.cloudfunctions.net/manualCleanup`
- Permite limpeza manual via HTTP request

## 🚀 Como Usar

### Frontend (Já Implementado)
Nada a fazer! A limpeza acontece automaticamente quando:
1. Você abre o lobby
2. As salas são listadas em tempo real

### Cloud Functions (Opcional - Recomendado para Produção)

#### Passo 1: Instalar Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

#### Passo 2: Inicializar Functions
```bash
cd "E:\Vscode Projetos\Prognostico\Progsnostico"
firebase init functions
```
Escolha:
- Use an existing project: `prognostico-game`
- Language: JavaScript
- ESLint: Yes (opcional)
- Install dependencies: Yes

#### Passo 3: Copiar o código
```bash
# Copie o conteúdo de firebase-functions.js para:
# functions/index.js
```

#### Passo 4: Deploy
```bash
firebase deploy --only functions
```

#### Passo 5: Verificar
```bash
firebase functions:log
```

## 📊 Monitoramento

### Ver Logs no Firebase Console
1. Acesse: https://console.firebase.google.com
2. Selecione: **prognostico-game**
3. Menu: **Functions** → **Logs**

### Ver Limpezas no Console do Browser
Abra o DevTools (F12) e veja:
```
🧹 X sala(s) inativa(s) removida(s)
```

## 🔧 Configuração

### Ajustar Tempo de Inatividade

**Frontend** (firebase.ts):
```typescript
const inactivityThreshold = 30 * 60 * 1000; // 30 minutos
// Altere para: 60 * 60 * 1000 para 1 hora
```

**Cloud Functions** (firebase-functions.js):
```javascript
const inactivityThreshold = 30 * 60 * 1000; // 30 minutos
```

### Ajustar Frequência de Limpeza

**Cloud Functions**:
```javascript
// De:
.schedule('every 15 minutes')
// Para:
.schedule('every 30 minutes')
// ou
.schedule('every 1 hours')
```

## 🎯 Recomendações

### Desenvolvimento
✅ Usar apenas limpeza do frontend (já implementado)

### Produção
✅ Implementar Cloud Functions para:
- Reduzir carga no frontend
- Limpeza garantida mesmo sem usuários online
- Melhor controle e logs centralizados

## 🐛 Troubleshooting

### Salas não estão sendo deletadas
1. Verifique se `lastActivity` está sendo atualizado:
```typescript
// Deve aparecer em updateRoomState()
lastActivity: Date.now()
```

2. Verifique as regras do Firebase:
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".write": true // Deve permitir deletar
      }
    }
  }
}
```

### Erro de permissão ao deletar
- Verifique se as regras do Firebase foram atualizadas
- Publique: [firebase-rules.json](firebase-rules.json)

## 📞 Suporte

Problemas ou dúvidas:
1. Verifique os logs no console
2. Teste manualmente: `cleanupInactiveRooms()`
3. Verifique as regras no Firebase Console
