/// <reference types="vite/client" />

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, remove, get, goOffline } from 'firebase/database';
import { GameState, RoomConfig, Player } from '../types';

// Use direct access for Vite replacement where possible, but protected by checks
// This prevents "TypeError: can't access property ..., import.meta.env is undefined"
const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : undefined;
const processEnv = (typeof process !== 'undefined' && process.env) ? process.env : undefined;

const firebaseConfig = {
  apiKey: (viteEnv && viteEnv.VITE_FIREBASE_API_KEY) || (processEnv && processEnv.REACT_APP_FIREBASE_API_KEY),
  authDomain: (viteEnv && viteEnv.VITE_FIREBASE_AUTH_DOMAIN) || (processEnv && processEnv.REACT_APP_FIREBASE_AUTH_DOMAIN),
  databaseURL: (viteEnv && viteEnv.VITE_FIREBASE_DATABASE_URL) || (processEnv && processEnv.REACT_APP_FIREBASE_DATABASE_URL),
  projectId: (viteEnv && viteEnv.VITE_FIREBASE_PROJECT_ID) || (processEnv && processEnv.REACT_APP_FIREBASE_PROJECT_ID),
  storageBucket: (viteEnv && viteEnv.VITE_FIREBASE_STORAGE_BUCKET) || (processEnv && processEnv.REACT_APP_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: (viteEnv && viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID) || (processEnv && processEnv.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
  appId: (viteEnv && viteEnv.VITE_FIREBASE_APP_ID) || (processEnv && processEnv.REACT_APP_FIREBASE_APP_ID)
};

let db: any = null;
let connectionError: string | null = null;

try {
    // Verifica se as chaves essenciais estão presentes
    if (firebaseConfig.apiKey && firebaseConfig.databaseURL) {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        console.log("Firebase inicializado via variáveis de ambiente.");
    } else {
        console.warn("Variáveis de ambiente (VITE_FIREBASE... ou REACT_APP_FIREBASE...) não encontradas. O jogo funcionará apenas Offline.");
    }
} catch (e: any) {
    console.error("Erro na conexão com Firebase:", e);
    connectionError = "Erro de Configuração.";
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

export const updateRoomState = (roomId: string, newState: Partial<GameState>) => {
    if (!db) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    const cleanState = sanitizeForFirebase(newState);
    
    update(roomRef, cleanState).catch(err => {
        handleFirebaseError(err);
    });
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
        const cleanData = sanitizeForFirebase({
            ...initialState,
            currentRoom: roomConfig,
            players: formatPlayersForFirebase(roomConfig.players)
        });
        
        await set(ref(db, `rooms/${roomConfig.id}`), cleanData);
    } catch (e) {
        handleFirebaseError(e);
        throw e;
    }
};

export const joinRoomDB = async (roomId: string, player: Player) => {
    if (!db) throw new Error("Servidor Offline");
    
    try {
        const roomRef = ref(db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const currentPlayers = data.players || [];
            
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
                'currentRoom/players': cleanPlayers
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
