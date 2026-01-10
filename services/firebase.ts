
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, push, remove, get, goOffline, query, orderByChild, equalTo, runTransaction, onDisconnect } from 'firebase/database';
import { GameState, RoomConfig, Player } from '../types';

// Configuração Firebase - TODAS as variáveis devem estar no arquivo .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let db: any = null;
let connectionError: string | null = null;

try {
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        console.log("Firebase conectado com sucesso:", firebaseConfig.databaseURL);
    } else {
        console.warn("Configuração do Firebase ausente ou inválida. Verifique o arquivo .env");
        connectionError = "Configuração do Firebase ausente. Verifique o arquivo .env";
    }
} catch (e: any) {
    console.error("Erro na conexão com Firebase:", e);
    connectionError = "Erro de Configuração do Firebase.";
}

// === HELPER PARA LIMPAR DADOS (Remove undefined) ===
const sanitizeForFirebase = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (Array.isArray(data)) {
        return data.map(sanitizeForFirebase);
    }
    if (typeof data === 'object') {
        const result: any = {};
        for (const key in data) {
            result[key] = sanitizeForFirebase(data[key]);
        }
        return result;
    }
    return data;
};

export const isOnline = () => !!db && !connectionError;

export const getFirebaseError = () => connectionError;

const handleFirebaseError = (error: any) => {
    const msg = error.message || '';
    console.error("Firebase Error:", msg);
    if (msg.includes('quota') || msg.includes('payment') || error.code === 'PERMISSION_DENIED') {
        connectionError = "Cota excedida ou Permissão negada. Modo Offline.";
        if (db) goOffline(db);
        return true;
    }
    return false;
};

export const createRoomRef = (roomId: string) => {
    if (!db) return null;
    return ref(db, `rooms/${roomId}`);
};

export const subscribeToRoom = (roomId: string, callback: (data: GameState | null) => void) => {
    if (!db) return () => {};
    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
        callback(snapshot.val());
    }, (error) => {
        console.error("Read error:", error);
        if (handleFirebaseError(error)) {
            callback(null);
        }
    });
    return unsubscribe;
};

export const updateRoomState = async (roomId: string, newState: Partial<GameState>) => {
    if (!db) return;
    console.log('📤 [FIREBASE] updateRoomState chamado:', {
        roomId,
        status: newState.status,
        currentTurn: newState.currentTurn,
        playersCount: newState.players?.length,
        tableCardsCount: newState.tableCards?.length
    });
    
    const roomRef = ref(db, `rooms/${roomId}`);
    
    try {
        // Usa transação para evitar conflitos
        await runTransaction(roomRef, (currentData) => {
            if (!currentData) {
                console.warn('⚠️ [FIREBASE] currentData é null na transação');
                return currentData;
            }
            
            // Sanitiza e merge com dados existentes
            const cleanState = sanitizeForFirebase({
                ...newState,
                lastActivity: Date.now()
            });
            
            const merged = { ...currentData, ...cleanState };
            console.log('✅ [FIREBASE] Transação: merge completo');
            return merged;
        });
        console.log('✅ [FIREBASE] Estado atualizado com sucesso');
    } catch (err) {
        console.error('❌ [FIREBASE] Erro na transação:', err);
        // Fallback para update normal se a transação falhar
        const cleanState = sanitizeForFirebase({
            ...newState,
            lastActivity: Date.now()
        });
        
        update(roomRef, cleanState).catch(err => {
            handleFirebaseError(err);
        });
    }
};

export const formatPlayersForFirebase = (players: Player[]) => {
    return players.map(p => ({
        ...p,
        hand: p.hand || [],
    }));
};

export const hostCreateRoom = async (roomConfig: RoomConfig, initialState: GameState) => {
    if (!db) throw new Error("Modo Offline Ativo");
    try {
        const hostId = roomConfig.players.find(p => p.isHost)?.id || 'unknown';
        
        const cleanData = sanitizeForFirebase({
            ...initialState,
            currentRoom: roomConfig,
            players: formatPlayersForFirebase(roomConfig.players),
            hostId: hostId,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });
        
        await set(ref(db, `rooms/${roomConfig.id}`), cleanData);
    } catch (e) {
        handleFirebaseError(e);
        throw e;
    }
};

export const joinRoomDB = async (roomId: string, player: Player, password?: string) => {
    if (!db) throw new Error("Servidor Offline");
    
    try {
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const currentPlayers = data.players || [];
            
            // Validar senha se a sala for privada
            if (data.currentRoom.isPrivate) {
                if (!password || password !== data.currentRoom.password) {
                    throw new Error("Senha incorreta");
                }
            }
            
            if (currentPlayers.length >= data.currentRoom.maxPlayers) {
                throw new Error("Sala Cheia");
            }

            const playerIndex = currentPlayers.findIndex((p: Player) => p.id === player.id);
            let updatedPlayers;
            
            if (playerIndex >= 0) {
                updatedPlayers = [...currentPlayers];
                updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], isLocal: false }; 
            } else {
                updatedPlayers = [...currentPlayers, player];
            }
            
            const cleanPlayers = sanitizeForFirebase(updatedPlayers);

            await update(roomRef, {
                players: cleanPlayers,
                'currentRoom/players': cleanPlayers,
                lastActivity: Date.now()
            });
            return true;
        } else {
            throw new Error("Sala não encontrada");
        }
    } catch (e: any) {
        handleFirebaseError(e);
        throw e;
    }
};

export const leaveRoomDB = async (roomId: string, playerId: string) => {
    if (!db) return;
    try {
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) return;

        const data = snapshot.val();
        const newPlayers = (data.players || []).filter((p: Player) => p.id !== playerId);

        if (newPlayers.length === 0) {
            await remove(roomRef);
        } else {
            const wasHost = (data.players || []).find((p: Player) => p.id === playerId)?.isHost;
            if (wasHost && newPlayers.length > 0) {
                newPlayers[0].isHost = true;
            }
            
            const cleanPlayers = sanitizeForFirebase(newPlayers);
            
            await update(roomRef, {
                players: cleanPlayers,
                'currentRoom/players': cleanPlayers
            });
        }
    } catch (e) {
        handleFirebaseError(e);
    }
};

export const listOpenRooms = (callback: (rooms: RoomConfig[]) => void) => {
    if (!db) {
        callback([]);
        return () => {};
    }
    
    const roomsRef = ref(db, 'rooms');
    
    const unsubscribe = onValue(roomsRef, (snapshot) => {
        const rooms: RoomConfig[] = [];
        const now = Date.now();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutos
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const roomsToDelete: string[] = [];
            
            Object.keys(data).forEach(roomId => {
                const roomData = data[roomId];
                const lastActivity = roomData.lastActivity || roomData.createdAt || 0;
                const isInactive = (now - lastActivity) > inactivityThreshold;
                
                // Marcar sala para deletar se estiver inativa
                if (isInactive) {
                    roomsToDelete.push(roomId);
                } else if (roomData.currentRoom && roomData.currentRoom.status === 'open') {
                    rooms.push(roomData.currentRoom);
                }
            });
            
            // Deletar salas inativas em background
            if (roomsToDelete.length > 0) {
                roomsToDelete.forEach(roomId => {
                    remove(ref(db, `rooms/${roomId}`)).catch(err => 
                        console.error(`Erro ao remover sala inativa ${roomId}:`, err)
                    );
                });
            }
        }
        callback(rooms);
    }, (error) => {
        console.error("Error listing rooms:", error);
        handleFirebaseError(error);
        callback([]);
    });
    
    return unsubscribe;
};

// Limpar salas antigas/órfãs manualmente
export const cleanupInactiveRooms = async () => {
    if (!db) return 0;
    
    try {
        const roomsRef = ref(db, 'rooms');
        const snapshot = await get(roomsRef);
        
        if (!snapshot.exists()) return 0;
        
        const now = Date.now();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutos
        let deletedCount = 0;
        
        const data = snapshot.val();
        const deletePromises: Promise<void>[] = [];
        
        Object.keys(data).forEach(roomId => {
            const roomData = data[roomId];
            const lastActivity = roomData.lastActivity || roomData.createdAt || 0;
            const isInactive = (now - lastActivity) > inactivityThreshold;
            
            if (isInactive) {
                deletePromises.push(
                    remove(ref(db, `rooms/${roomId}`))
                        .then(() => { deletedCount++; })
                        .catch(err => console.error(`Erro ao deletar sala ${roomId}:`, err))
                );
            }
        });
        
        await Promise.all(deletePromises);
        return deletedCount;
    } catch (e) {
        console.error("Erro na limpeza de salas:", e);
        return 0;
    }
};

// === SISTEMA DE DETECÇÃO DE PRESENÇA ===
export const setupPlayerPresence = (roomId: string, playerId: string) => {
    if (!db) return;
    
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}/online`);
    const roomRef = ref(db, `rooms/${roomId}`);
    
    // Marca como online
    set(playerRef, true);
    
    // Configura o que fazer quando desconectar
    const disconnectRef = onDisconnect(playerRef);
    disconnectRef.set(false);
    
    // Também atualiza lastActivity quando desconectar
    const activityRef = onDisconnect(ref(db, `rooms/${roomId}/players/${playerId}/lastActivity`));
    activityRef.set(Date.now());
    
    return () => {
        // Cleanup ao sair normalmente
        set(playerRef, false);
        disconnectRef.cancel();
        activityRef.cancel();
    };
};

// === REMOVER PLAYER DA SALA ===
export const removePlayerFromRoom = async (roomId: string, playerId: string) => {
    if (!db) return;
    
    try {
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) return;
        
        const roomData = snapshot.val();
        const updatedPlayers = (roomData.currentRoom?.players || []).filter((p: Player) => p.id !== playerId);
        
        // Se não sobrou ninguém, deleta a sala
        if (updatedPlayers.length === 0) {
            await remove(roomRef);
            console.log(`🗑️ Sala ${roomId} removida - todos os players saíram`);
            return;
        }
        
        // Se o host saiu, transfere para o próximo player
        const oldHost = roomData.currentRoom?.players?.find((p: Player) => p.isHost);
        if (oldHost?.id === playerId) {
            updatedPlayers[0].isHost = true;
            console.log(`👑 Host transferido para ${updatedPlayers[0].name}`);
        }
        
        // Atualiza a sala
        await update(roomRef, {
            'currentRoom/players': updatedPlayers,
            lastActivity: Date.now()
        });
        
        console.log(`👋 Player ${playerId} removido da sala ${roomId}`);
    } catch (e) {
        console.error('Erro ao remover player:', e);
    }
};

// === MONITORAR PLAYERS OFFLINE E REMOVER AUTOMATICAMENTE ===
export const monitorPlayerActivity = (roomId: string, onPlayerRemoved?: (playerId: string) => void) => {
    if (!db) return () => {};
    
    const roomRef = ref(db, `rooms/${roomId}/players`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) return;
        
        const players = snapshot.val();
        const now = Date.now();
        const offlineThreshold = 10000; // 10 segundos offline = remove
        
        Object.keys(players).forEach(playerId => {
            const player = players[playerId];
            const lastActivity = player.lastActivity || 0;
            const isOffline = player.online === false;
            const timeSinceActivity = now - lastActivity;
            
            // Remove se estiver offline por muito tempo
            if (isOffline && timeSinceActivity > offlineThreshold) {
                console.log(`⚠️ Player ${playerId} offline há ${timeSinceActivity}ms, removendo...`);
                removePlayerFromRoom(roomId, playerId);
                onPlayerRemoved?.(playerId);
            }
        });
    });
    
    return unsubscribe;
};
