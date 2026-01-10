// Firebase Cloud Functions para limpeza automática de salas
// Para usar: npm install -g firebase-tools && firebase init functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Executar a cada 15 minutos
exports.cleanupInactiveRooms = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutos
    
    try {
      const snapshot = await admin.database()
        .ref('rooms')
        .once('value');
      
      if (!snapshot.exists()) {
        console.log('Nenhuma sala encontrada');
        return null;
      }
      
      const rooms = snapshot.val();
      const updates = {};
      let deletedCount = 0;
      
      Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        const lastActivity = room.lastActivity || room.createdAt || 0;
        const isInactive = (now - lastActivity) > inactivityThreshold;
        
        if (isInactive) {
          updates[roomId] = null; // Marca para deletar
          deletedCount++;
          console.log(`Deletando sala inativa: ${roomId} (última atividade: ${new Date(lastActivity).toISOString()})`);
        }
      });
      
      if (deletedCount > 0) {
        await admin.database().ref('rooms').update(updates);
        console.log(`✅ ${deletedCount} sala(s) inativa(s) deletada(s)`);
      } else {
        console.log('✅ Nenhuma sala inativa encontrada');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro na limpeza de salas:', error);
      return null;
    }
  });

// Limpar salas completamente vazias (backup)
exports.cleanupEmptyRooms = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    try {
      const snapshot = await admin.database()
        .ref('rooms')
        .once('value');
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const rooms = snapshot.val();
      const updates = {};
      let deletedCount = 0;
      
      Object.keys(rooms).forEach(roomId => {
        const room = rooms[roomId];
        const players = room.players || [];
        
        if (players.length === 0 || !Array.isArray(players)) {
          updates[roomId] = null;
          deletedCount++;
          console.log(`Deletando sala vazia: ${roomId}`);
        }
      });
      
      if (deletedCount > 0) {
        await admin.database().ref('rooms').update(updates);
        console.log(`✅ ${deletedCount} sala(s) vazia(s) deletada(s)`);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao limpar salas vazias:', error);
      return null;
    }
  });

// Webhook para limpeza manual
exports.manualCleanup = functions.https.onRequest(async (req, res) => {
  // Adicione autenticação aqui se necessário
  const now = Date.now();
  const inactivityThreshold = 30 * 60 * 1000;
  
  try {
    const snapshot = await admin.database()
      .ref('rooms')
      .once('value');
    
    if (!snapshot.exists()) {
      res.json({ success: true, deleted: 0, message: 'Nenhuma sala encontrada' });
      return;
    }
    
    const rooms = snapshot.val();
    const updates = {};
    let deletedCount = 0;
    
    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      const lastActivity = room.lastActivity || room.createdAt || 0;
      const isInactive = (now - lastActivity) > inactivityThreshold;
      
      if (isInactive) {
        updates[roomId] = null;
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      await admin.database().ref('rooms').update(updates);
    }
    
    res.json({ 
      success: true, 
      deleted: deletedCount,
      message: `${deletedCount} sala(s) inativa(s) deletada(s)`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});
