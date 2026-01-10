
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CRTOverlay } from './components/CRTOverlay';
import { Sidebar } from './components/Sidebar';
import { GameArea } from './components/GameArea';
import { MainMenu } from './components/MainMenu';
import { RoomBrowser } from './components/RoomBrowser';
import { WaitingRoom } from './components/WaitingRoom';
import { RoundSummary } from './components/RoundSummary';
import { TutorialOverlay, getHighlightId } from './components/TutorialOverlay';
import { GameState, Card, Player, PlayedCard, Suit, TrickRecord, RoomConfig, Language } from './types';
import { generateDeck, calculateRoundSequence } from './constants';
import { determineTrickWinner, calculateRoundResults, getBotBid, getBotCardToPlay } from './services/gameService';
import { playSound } from './services/soundService';
import { isOnline, getFirebaseError, hostCreateRoom, joinRoomDB, subscribeToRoom, updateRoomState, leaveRoomDB, formatPlayersForFirebase, setupPlayerPresence, monitorPlayerActivity } from './services/firebase.ts';
import { WifiOff, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [localPlayerName, setLocalPlayerName] = useState('Jogador 1');
  const [localPlayerId, setLocalPlayerId] = useState('p1');
  const [lang, setLang] = useState<Language>('pt');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Ref para evitar múltiplas chamadas de announceTrickWinner
  const lastAnnouncedTrick = useRef<string>('');

  const getInitialState = (): GameState => ({
    status: 'menu',
    currentTurn: '',
    startPlayerIndex: 0,
    currentTrickLeader: '',
    round: 1,
    roundIndex: 0,
    roundSequence: [],
    totalRounds: 10, 
    trumpCard: null,
    tableCards: [],
    trickHistory: [],
    leadSuit: null,
    players: [],
    deck: [],
  });

  const [gameState, setGameState] = useState<GameState>(getInitialState());

  // Garantir que players sempre seja um array
  useEffect(() => {
      if (!Array.isArray(gameState.players)) {
          console.error('❌ gameState.players não é um array!', gameState.players);
          setGameState(prev => ({
              ...prev,
              players: []
          }));
      }
  }, [gameState.players]);

  // Log do estado do jogo para debug
  useEffect(() => {
      const safePlayers = Array.isArray(gameState.players) ? gameState.players : [];
      console.log('🎮 [GAME STATE]', {
          status: gameState.status,
          currentTurn: gameState.currentTurn,
          localPlayerId,
          isMyTurn: gameState.currentTurn === localPlayerId,
          players: safePlayers.map(p => ({
              id: p.id,
              name: p.name,
              isLocal: p.isLocal,
              bid: p.currentBid,
              tricks: p.tricksWon
          })),
          tableCards: gameState.tableCards.length
      });
  }, [gameState.status, gameState.currentTurn, gameState.players, gameState.tableCards, localPlayerId]);

  useEffect(() => {
      if (!isOfflineMode) {
          const err = getFirebaseError();
          if (err) setFirebaseError(err);
      } else {
          setFirebaseError(null);
      }

      if (isOnline() && !isOfflineMode) { 
        const id = 'user-' + Math.random().toString(36).substr(2, 9);
        setLocalPlayerId(id);
      } else {
        setLocalPlayerId('offline-p1');
      }
  }, [isOfflineMode]);

  useEffect(() => {
      if (isTutorial || isOfflineMode) return;
      if (!gameState.currentRoom || !isOnline()) return;

      const unsubscribe = subscribeToRoom(gameState.currentRoom.id, (remoteState) => {
          const err = getFirebaseError();
          if (err) {
              setFirebaseError(err);
              setGameState(prev => ({ ...getInitialState(), status: 'menu' }));
              return;
          }

          if (remoteState) {
              // Firebase já normaliza players para array no subscribeToRoom
              const remotePlayers = remoteState.players || [];
              
              console.log('📥 [FIREBASE] Estado recebido do Firebase:', {
                  status: remoteState.status,
                  currentTurn: remoteState.currentTurn,
                  playersCount: remotePlayers.length,
                  players: remotePlayers.map((p: any) => ({ id: p.id, bid: p.currentBid, tricks: p.tricksWon })),
                  tableCards: remoteState.tableCards?.length || 0
              });
              
              const mappedPlayers = remotePlayers.map(p => ({
                  ...p,
                  isLocal: p.id === localPlayerId,
                  hand: p.hand || [],
                  // Firebase remove null, então garantimos que seja null e não undefined
                  currentBid: p.currentBid === undefined ? null : p.currentBid,
                  tricksWon: p.tricksWon || 0
              }));

              setGameState(prev => {
                  // Garante que prev.players é array
                  const prevPlayers = Array.isArray(prev.players) ? prev.players : [];
                  
                  // Preserva o estado local APENAS durante a fase de bidding
                  // Isso evita que bids sejam perdidos por race conditions durante o bidding
                  // Mas permite que o estado seja atualizado em outras fases (round_end, etc.)
                  const shouldPreserveBid = prev.status === 'bidding' && remoteState.status === 'bidding';
                  
                  if (shouldPreserveBid) {
                      const localPlayer = prevPlayers.find(p => p.id === localPlayerId);
                      const remotePlayer = mappedPlayers.find(p => p.id === localPlayerId);
                      
                      // Se o jogador local tem um bid mas o remoto não tem, não sobrescreve ainda
                      if (localPlayer?.currentBid !== null && localPlayer?.currentBid !== undefined && 
                          (remotePlayer?.currentBid === null || remotePlayer?.currentBid === undefined)) {
                          console.log('⏸️ [FIREBASE] Preservando bid local (bidding phase), aguardando sincronização...', { 
                              localBid: localPlayer.currentBid, 
                              remoteBid: remotePlayer?.currentBid 
                          });
                          return prev;
                      }
                  }

                  console.log('✅ [FIREBASE] Aplicando estado remoto');
                  return {
                      ...remoteState,
                      players: mappedPlayers,
                      currentRoom: { ...remoteState.currentRoom!, players: mappedPlayers },
                      // Ensure arrays are initialized if missing from Firebase (Firebase removes empty arrays)
                      trickHistory: remoteState.trickHistory || [],
                      tableCards: remoteState.tableCards || [],
                      roundSequence: remoteState.roundSequence || [],
                      deck: remoteState.deck || []
                  };
              });
          } else {
              setGameState(prev => ({ ...getInitialState(), status: 'room_browser' }));
          }
      });

      return () => unsubscribe();
  }, [gameState.currentRoom?.id, localPlayerId, isTutorial, isOfflineMode]);

  // Detecta quando rodada está completa e host precisa anunciar vencedor
  useEffect(() => {
      if (isTutorial || isOfflineMode) return;
      if (gameState.status !== 'playing') return;
      if (gameState.currentTurn !== '') return; // Só quando currentTurn está vazio
      if (gameState.tableCards.length === 0) return; // Precisa ter cartas na mesa
      if (gameState.tableCards.length !== gameState.players.length) return; // Precisa ter todas as cartas

      // Criar ID único para esta rodada (baseado nas cartas jogadas)
      const trickId = gameState.tableCards
          .map(tc => `${tc.playerId}-${tc.card.rank}${tc.card.suit}`)
          .sort()
          .join('|');
      
      // Evita processar a mesma rodada múltiplas vezes
      if (lastAnnouncedTrick.current === trickId) {
          console.log('⏭️ [EFFECT] Rodada já processada, ignorando...', { trickId });
          return;
      }

      const amIHost = gameState.players.find(p => p.id === localPlayerId)?.isHost ?? false;
      
      console.log('🔍 [EFFECT] Rodada completa detectada via Firebase:', { 
          tableCards: gameState.tableCards.length, 
          players: gameState.players.length,
          amIHost,
          currentTurn: gameState.currentTurn,
          trickId
      });

      if (amIHost) {
          console.log('👑 [EFFECT] Sou o host, anunciando vencedor...');
          lastAnnouncedTrick.current = trickId; // Marca como processado
          // Pequeno delay para garantir que todos receberam o estado completo
          setTimeout(() => {
              announceTrickWinner(gameState.tableCards, gameState.leadSuit, gameState.players);
          }, 500);
      } else {
          console.log('👤 [EFFECT] Não sou host, aguardando...');
      }
  }, [gameState.tableCards, gameState.currentTurn, gameState.status, gameState.players, localPlayerId, isTutorial, isOfflineMode]);

  // Sistema de detecção de presença
  useEffect(() => {
      if (isTutorial || isOfflineMode || !gameState.currentRoom) return;
      
      const roomId = gameState.currentRoom.id;
      
      // Configura presença do player atual
      const cleanupPresence = setupPlayerPresence(roomId, localPlayerId);
      
      // Monitora players offline e remove automaticamente
      const unsubscribeMonitor = monitorPlayerActivity(roomId, (removedPlayerId) => {
          console.log(`🚫 Player ${removedPlayerId} foi removido por inatividade`);
      });
      
      return () => {
          cleanupPresence?.();
          unsubscribeMonitor?.();
      };
  }, [gameState.currentRoom?.id, localPlayerId, isTutorial, isOfflineMode]);

  const isHost = () => {
      if (isTutorial) return true;
      if (!gameState.currentRoom) return true;
      if (isOfflineMode || gameState.currentRoom.id === 'offline-room' || gameState.currentRoom.id.startsWith('offline-')) {
          return true;
      }
      const players = Array.isArray(gameState.players) ? gameState.players : [];
      return players.find(p => p.id === localPlayerId)?.isHost ?? false;
  };

  const syncState = (newState: Partial<GameState>) => {
      // Remove campos undefined para não sobrescrever dados existentes no Firebase
      const cleanState: Partial<GameState> = {};
      for (const key in newState) {
          if (newState[key as keyof GameState] !== undefined) {
              cleanState[key as keyof GameState] = newState[key as keyof GameState] as any;
          }
      }
      
      console.log('🔄 [SYNC] Iniciando syncState:', {
          status: cleanState.status,
          currentTurn: cleanState.currentTurn,
          playersUpdate: cleanState.players?.map(p => ({ id: p.id, bid: p.currentBid, tricksWon: p.tricksWon })),
          isOnline: isOnline(),
          roomId: gameState.currentRoom?.id
      });
      
      if (isTutorial || isOfflineMode) {
          setGameState(prev => ({ ...prev, ...cleanState }));
      } else if (isOnline() && gameState.currentRoom && !firebaseError) {
          if (!gameState.currentRoom.id.startsWith('offline-')) {
             // Atualiza localmente primeiro para resposta imediata
             console.log('✅ [SYNC] Atualizando estado local primeiro');
             setGameState(prev => ({ ...prev, ...cleanState }));
             // Depois sincroniza com Firebase
             console.log('📤 [SYNC] Enviando para Firebase...');
             updateRoomState(gameState.currentRoom.id, cleanState);
          } else {
             setGameState(prev => ({ ...prev, ...cleanState }));
          }
      } else {
          setGameState(prev => ({ ...prev, ...cleanState }));
      }
  };

  const handleEnterName = (name: string, mode: 'online' | 'offline') => {
    setLocalPlayerName(name);
    if (mode === 'offline') {
        setIsOfflineMode(true);
        setLocalPlayerId('offline-p1');
        setGameState(prev => ({ ...prev, status: 'room_browser' }));
    } else {
        setIsOfflineMode(false);
        setGameState(prev => ({ ...prev, status: 'room_browser' }));
    }
  };

  const startTutorial = () => {
      setIsTutorial(true);
      setTutorialStep(0);
      setFirebaseError(null);
      setIsOfflineMode(true); 
      
      const me: Player = { 
          id: 'tut-me', name: 'Você', isLocal: true, score: 0, tricksWon: 0, isReady: true, currentBid: null,
          hand: [
             { id: 'c1', rank: '2', suit: 'hearts', isSelected: false },
             { id: 'c2', rank: 'K', suit: 'spades', isSelected: false },
             { id: 'AD', rank: 'A', suit: 'diamonds', isSelected: false },
          ]
      };
      const bot: Player = { 
          id: 'tut-bot', name: 'Bot Instrutor', isLocal: false, score: 0, tricksWon: 0, isReady: true, currentBid: 1,
          hand: [
             { id: 'b1', rank: '3', suit: 'diamonds', isSelected: false },
             { id: 'b2', rank: '5', suit: 'spades', isSelected: false },
             { id: 'b3', rank: '2', suit: 'clubs', isSelected: false },
          ]
      };

      setGameState({
          ...getInitialState(),
          status: 'bidding',
          players: [bot, me],
          currentTurn: 'tut-me',
          round: 3,
          totalRounds: 3,
          trumpCard: { id: 'trump', rank: '10', suit: 'clubs', isSelected: false },
          currentTrickLeader: 'tut-bot',
      });
  };

  const nextTutorialStep = () => {
      const current = tutorialStep;
      const next = current + 1;
      setTutorialStep(next);

      if (isTutorial) {
          if (current === 7) { 
               announceTrickWinner(gameState.tableCards, gameState.leadSuit, gameState.players, false);
          }
          if (current === 11) {
               announceTrickWinner(gameState.tableCards, gameState.leadSuit, gameState.players, false);
          }
          if (current === 14) {
               announceTrickWinner(gameState.tableCards, gameState.leadSuit, gameState.players, false);
          }

          if (current === 8 || current === 12 || current === 15) {
              if (gameState.status === 'trick_summary') {
                 cleanupTrick(gameState.trickResult?.winnerId!, gameState.tableCards, gameState.leadSuit, gameState.players, false);
              }
          }
      }
  };

  const handleTutorialContinuePlaying = () => {
     setIsTutorial(false);
     setGameState(getInitialState());
  };

  const handleTutorialAction = (action: string, payload?: any) => {
      if (action === 'bid' && tutorialStep === 4) {
          submitBid(payload);
          nextTutorialStep();
      }
      
      if (action === 'play' && tutorialStep === 6) {
          if (payload.rank === 'A' && payload.suit === 'diamonds') { 
             playCard(payload);
             setTimeout(() => nextTutorialStep(), 500); 
          } else {
              playSound('flip'); 
          }
      }

      if (action === 'click_history' && tutorialStep === 9) {
          nextTutorialStep();
      }

      if (action === 'play' && tutorialStep === 10) {
          if (payload.rank === 'K' && payload.suit === 'spades') {
              playCard(payload);
          } else {
              playSound('flip');
          }
      }

      if (action === 'play' && tutorialStep === 13) {
          if (payload.rank === '2' && payload.suit === 'hearts') {
              playCard(payload);
          } else {
              playSound('flip');
          }
      }
  };

  const handleCreateRoom = async (config: Partial<RoomConfig>) => {
    if (firebaseError && !isOfflineMode) {
        alert("O modo online está indisponível no momento.");
        return;
    }

    const roomId = isOfflineMode ? 'offline-' + Date.now() : Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newRoom: RoomConfig = {
      id: roomId,
      name: config.name || "Nova Sala",
      isPrivate: !!config.isPrivate,
      password: config.password || null, // Convert undefined to null
      maxPlayers: config.maxPlayers || 7,
      gameMode: config.gameMode || 'up',
      maxHandSize: config.maxHandSize || 0,
      totalRounds: 0,
      status: 'open',
      players: [
        { id: localPlayerId, name: localPlayerName, isLocal: true, hand: [], score: 0, currentBid: null, tricksWon: 0, isHost: true, isReady: false }
      ]
    };

    const newState = {
        ...getInitialState(),
        currentRoom: newRoom,
        players: newRoom.players,
        status: 'waiting_room' as const
    };

    if (isOfflineMode) {
        setGameState(newState);
    } else {
        if (isOnline()) {
            try {
                await hostCreateRoom(newRoom, newState);
                setGameState(prev => ({ ...prev, currentRoom: newRoom })); 
            } catch (e: any) {
                 const err = getFirebaseError();
                 if (err) setFirebaseError(err);
                 else alert("Erro ao criar sala: " + e.message);
            }
        }
    }
  };

  const handleJoinRoom = async (roomId: string, passwordInput?: string) => {
    if (firebaseError) {
        alert("O modo online está indisponível.");
        return;
    }
    if (isOnline()) {
        try {
            const me: Player = { id: localPlayerId, name: localPlayerName, isLocal: true, hand: [], score: 0, currentBid: null, tricksWon: 0, isHost: false, isReady: false };
            await joinRoomDB(roomId, me, passwordInput);
            setGameState(prev => ({ ...prev, currentRoom: { ...prev.currentRoom!, id: roomId } })); 
        } catch (e: any) {
            alert(e.message);
        }
    }
  };

  const handleLeaveRoom = () => {
    console.log("APP: handleLeaveRoom chamado. Resetando tudo.");
    
    // Attempt online cleanup if relevant
    if (isOnline() && gameState.currentRoom && !gameState.currentRoom.id.startsWith('offline-')) {
        try {
            console.log("APP: Saindo da sala online...");
            leaveRoomDB(gameState.currentRoom.id, localPlayerId);
        } catch (e) { console.error(e); }
    }
    
    // Explicitly reset everything in one go to prevent race conditions
    // Use setTimeout to ensure this happens after any pending async tasks
    setTimeout(() => {
        setIsTutorial(false);
        setIsOfflineMode(false);
        setGameState(getInitialState());
    }, 10);
  };

  const handleStartGame = () => {
    if (!isHost() || !gameState.currentRoom) return;
    const numPlayers = gameState.players.length;
    if (numPlayers < 2) return;

    const mode = gameState.currentRoom.gameMode;
    const maxHandCap = gameState.currentRoom.maxHandSize;
    const sequence = calculateRoundSequence(numPlayers, mode, maxHandCap);
    const newState: Partial<GameState> = {
        roundSequence: sequence,
        totalRounds: sequence.length,
        roundIndex: 0,
        round: sequence[0],
    };
    startRoundLogic(sequence[0], gameState.players, 0, sequence, newState);
  };

  const startRoundLogic = (cardsToDeal: number, existingPlayers: Player[], nextStartIdx: number, sequence: number[], extraState: Partial<GameState> = {}) => {
    const deck = generateDeck();
    const playersReset = existingPlayers.map(p => ({ ...p, isReady: false }));
    const playersWithHands = playersReset.map(p => ({
      ...p,
      hand: deck.splice(0, cardsToDeal).sort((a,b) => {
         if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
         return 0; 
      }), 
      currentBid: null,
      tricksWon: 0
    }));

    const trump = deck.length > 0 ? deck.pop() || null : null; 
    const startPlayerId = playersWithHands[nextStartIdx].id;

    syncState({
      ...extraState,
      status: 'bidding',
      round: cardsToDeal, 
      roundSequence: sequence.length > 0 ? sequence : gameState.roundSequence,
      deck: [],
      trumpCard: trump,
      players: playersWithHands,
      tableCards: [],
      trickHistory: [],
      trickResult: null, // Fixed: undefined -> null
      roundResults: null, // Fixed: undefined -> null
      leadSuit: null,
      startPlayerIndex: nextStartIdx,
      currentTrickLeader: startPlayerId,
      currentTurn: startPlayerId
    });
  };

  const submitBid = (amount: number) => {
    const playerId = isTutorial ? 'tut-me' : localPlayerId;
    console.log('🎲 [BID] submitBid chamado:', { playerId, amount, currentTurn: gameState.currentTurn });
    
    if (gameState.currentTurn !== playerId) {
        console.warn('⚠️ [BID] Não é a vez deste jogador!', { currentTurn: gameState.currentTurn, playerId });
        return;
    }

    const updatedPlayers = gameState.players.map(p => 
      p.id === playerId ? { ...p, currentBid: amount } : p
    );
    
    console.log('👥 [BID] Players atualizados:', updatedPlayers.map(p => ({ id: p.id, bid: p.currentBid })));
    
    if (isTutorial) {
         setGameState(prev => ({
            ...prev,
            players: updatedPlayers,
            status: 'playing',
            currentTurn: 'tut-bot', 
            currentTrickLeader: 'tut-bot'
         }));
         
         setTimeout(() => {
             const botCard = { id: 'b1', rank: '3' as const, suit: 'diamonds' as const, isSelected: false };
             const botPlayed = [{ playerId: 'tut-bot', card: botCard }];
             setGameState(prev => ({
                 ...prev,
                 tableCards: botPlayed,
                 leadSuit: 'diamonds',
                 currentTurn: 'tut-me'
             }));
             nextTutorialStep(); 
         }, 800);
         return;
    }

    const nextId = getNextPlayerId(localPlayerId, gameState.players);
    const startPlayerId = gameState.players[gameState.startPlayerIndex].id;
    const everyoneBid = updatedPlayers.every(p => p.currentBid !== null && p.currentBid !== undefined);

    console.log('🔍 [BID] Verificando se todos fizeram bid:', { 
        everyoneBid, 
        bids: updatedPlayers.map(p => ({ id: p.id, bid: p.currentBid })) 
    });

    let nextStatus = gameState.status;
    let nextTurn = nextId;
    let nextLeader = gameState.currentTrickLeader;

    if (everyoneBid) {
        console.log('✅ [BID] Todos fizeram bid! Mudando para "playing"');
        nextStatus = 'playing';
        nextTurn = startPlayerId;
        nextLeader = startPlayerId;
    } else {
        console.log('⏳ [BID] Aguardando mais bids, próximo turno:', nextId);
    }

    syncState({
        players: updatedPlayers,
        status: nextStatus,
        currentTurn: nextTurn,
        currentTrickLeader: nextLeader
    });
  };

  const playCard = (card: Card) => {
    const playerId = isTutorial ? 'tut-me' : localPlayerId;
    console.log('🃏 [CARD] playCard chamado:', { 
        playerId, 
        card: `${card.rank}${card.suit}`, 
        currentTurn: gameState.currentTurn,
        tableCards: gameState.tableCards.length
    });
    
    if (gameState.currentTurn !== playerId) {
        console.warn('⚠️ [CARD] Não é a vez deste jogador!', { currentTurn: gameState.currentTurn, playerId });
        return;
    }

    const myPlayer = gameState.players.find(p => p.id === playerId)!;
    const newHand = myPlayer.hand.filter(c => c.id !== card.id);
    const newTableCards = [...gameState.tableCards, { playerId, card }];
    const currentLeadSuit = gameState.leadSuit || card.suit;
    const updatedPlayers = gameState.players.map(p => 
      p.id === playerId ? { ...p, hand: newHand } : p
    );
    
    const isTrickComplete = newTableCards.length === gameState.players.length;
    console.log('🃏 [CARD] Estado após jogar:', { 
        newTableCardsCount: newTableCards.length, 
        isTrickComplete,
        totalPlayers: gameState.players.length
    });

    if (isTutorial) {
        if (tutorialStep === 6) {
            setGameState(prev => ({
                ...prev,
                players: updatedPlayers,
                tableCards: newTableCards,
                leadSuit: currentLeadSuit,
                currentTurn: ''
            }));
            return;
        }

        if (tutorialStep === 10) {
             setGameState(prev => ({
                 ...prev,
                 players: updatedPlayers,
                 tableCards: newTableCards,
                 leadSuit: currentLeadSuit,
                 currentTurn: 'tut-bot'
             }));
             setTimeout(() => {
                 const botCard = { id: 'b2', rank: '5' as const, suit: 'spades' as const, isSelected: false };
                 const finalTableCards = [...newTableCards, { playerId: 'tut-bot', card: botCard }];
                 const botPlayer = updatedPlayers.find(p => p.id === 'tut-bot')!;
                 const botHand = botPlayer.hand.filter(c => c.id !== 'b2');
                 const finalPlayers = updatedPlayers.map(p => p.id === 'tut-bot' ? { ...p, hand: botHand } : p);

                 setGameState(prev => ({
                    ...prev,
                    players: finalPlayers,
                    tableCards: finalTableCards,
                    currentTurn: ''
                 }));
                 nextTutorialStep();
             }, 800);
             return;
        }

        if (tutorialStep === 13) {
             setGameState(prev => ({
                 ...prev,
                 players: updatedPlayers,
                 tableCards: newTableCards,
                 leadSuit: currentLeadSuit,
                 currentTurn: 'tut-bot'
             }));
             setTimeout(() => {
                 const botCard = { id: 'b3', rank: '2' as const, suit: 'clubs' as const, isSelected: false };
                 const finalTableCards = [...newTableCards, { playerId: 'tut-bot', card: botCard }];
                 const botPlayer = updatedPlayers.find(p => p.id === 'tut-bot')!;
                 const botHand = botPlayer.hand.filter(c => c.id !== 'b3');
                 const finalPlayers = updatedPlayers.map(p => p.id === 'tut-bot' ? { ...p, hand: botHand } : p);

                 setGameState(prev => ({
                    ...prev,
                    players: finalPlayers,
                    tableCards: finalTableCards,
                    currentTurn: ''
                 }));
                 nextTutorialStep();
             }, 800);
             return;
        }
    }

    if (isTrickComplete) {
        console.log('🏁 [CARD] Rodada completa! Determinando vencedor...');
        syncState({
            players: updatedPlayers,
            tableCards: newTableCards,
            leadSuit: currentLeadSuit,
            currentTurn: '' 
        });
        
        // Verifica se é host usando o updatedPlayers ao invés de gameState.players
        const localPlayer = updatedPlayers.find(p => p.id === localPlayerId);
        const amIHost = localPlayer?.isHost ?? false;
        
        console.log('🎯 [CARD] Verificando host:', { 
            localPlayerId, 
            isHost: amIHost,
            localPlayer: localPlayer ? { id: localPlayer.id, isHost: localPlayer.isHost } : null
        });
        
        if (amIHost) {
            console.log('👑 [CARD] Sou o host, anunciando vencedor em 800ms...');
            setTimeout(() => announceTrickWinner(newTableCards, currentLeadSuit, updatedPlayers), 800);
        } else {
            console.log('👤 [CARD] Não sou host, aguardando anúncio do vencedor...');
        }
    } else {
        syncState({
            players: updatedPlayers,
            tableCards: newTableCards,
            leadSuit: currentLeadSuit,
            currentTurn: getNextPlayerId(playerId, gameState.players)
        });
    }
  };

  const announceTrickWinner = (cards: PlayedCard[], suit: Suit | null, currentPlayers: Player[], advanceTutorial: boolean = true) => {
    console.log('🏆 [TRICK] announceTrickWinner chamado:', { 
        cardsCount: cards.length, 
        trumpCard: gameState.trumpCard,
        players: currentPlayers.map(p => ({ id: p.id, name: p.name }))
    });
    
    const winnerId = determineTrickWinner(cards, gameState.trumpCard);
    const winningCard = cards.find(c => c.playerId === winnerId)?.card!;
    
    console.log('🎯 [TRICK] Vencedor determinado:', { 
        winnerId, 
        winningCard: winningCard ? `${winningCard.rank}${winningCard.suit}` : null 
    });
    
    playSound('win_trick');
    const playersResetReady = currentPlayers.map(p => ({ ...p, isReady: false }));
    
    syncState({
        status: 'trick_summary',
        players: playersResetReady,
        trickResult: { winnerId, winningCard, pointsAdded: 1 },
    });
    
    if (isTutorial && advanceTutorial) {
        nextTutorialStep(); 
    }
  };

  const cleanupTrick = (winnerId: string, cards: PlayedCard[], suit: Suit | null, currentPlayers: Player[], advanceTutorial: boolean = true) => {
      const updatedPlayers = currentPlayers.map(p => 
        p.id === winnerId ? { ...p, tricksWon: p.tricksWon + 1 } : p
      );
      const record: TrickRecord = {
        round: gameState.round,
        trickNumber: (gameState.trickHistory?.length || 0) + 1, // Fallback safely
        cards: cards,
        winnerId: winnerId,
        leadSuit: suit
      };

      if (updatedPlayers[0].hand.length === 0) {
        const { updatedPlayers: scoredPlayers, results } = calculateRoundResults(updatedPlayers);
        
        // --- FIX: Reset player readiness to false when moving to round summary ---
        const playersReset = scoredPlayers.map(p => ({ ...p, isReady: false }));

        const resultsInit = results.map(r => ({ ...r, isReady: false }));
        syncState({
          status: 'round_end',
          players: playersReset, 
          roundResults: resultsInit, 
          tableCards: [],
          trickResult: null, // Fixed: undefined -> null
          trickHistory: [...(gameState.trickHistory || []), record], // Fallback safely
          leadSuit: null
        });
        if (isTutorial && advanceTutorial) {
             nextTutorialStep();
        }
      } else {
        syncState({
          status: 'playing',
          players: updatedPlayers,
          tableCards: [],
          trickResult: null, // Fixed: undefined -> null
          trickHistory: [...(gameState.trickHistory || []), record], // Fallback safely
          leadSuit: null,
          currentTurn: winnerId,
          currentTrickLeader: winnerId
        });
        
        if (isTutorial && advanceTutorial) {
            nextTutorialStep();
        }
      }
  };

  const getNextPlayerId = (currentId: string, players: Player[]) => {
    // Garante que players é um array
    const safePlayers = Array.isArray(players) ? players : [];
    if (safePlayers.length === 0) return currentId;
    
    const idx = safePlayers.findIndex(p => p.id === currentId);
    return safePlayers[(idx + 1) % safePlayers.length].id;
  };

  const handleKickPlayer = (pid: string) => {
      if (isOfflineMode) {
          const newPlayers = gameState.players.filter(p => p.id !== pid);
          syncState({ players: newPlayers, currentRoom: { ...gameState.currentRoom!, players: newPlayers } });
      } else {
          isHost() && leaveRoomDB(gameState.currentRoom!.id, pid);
      }
  };

  const handleToggleLobbyReady = () => {
       const ps = gameState.players.map(p => p.id === localPlayerId ? { ...p, isReady: !p.isReady } : p);
       syncState({ players: ps, currentRoom: { ...gameState.currentRoom!, players: ps } });
  };
  const handleUpdateRoomSettings = (s: Partial<RoomConfig>) => isHost() && syncState({ currentRoom: { ...gameState.currentRoom!, ...s } });
  
  const handleAddBot = () => {
      const botCount = gameState.players.filter(p => p.id.startsWith('bot-')).length;
      const botId = `bot-${botCount + 1}`;
      const bot: Player = { 
          id: botId, 
          name: `Bot ${botCount + 1}`, 
          isLocal: false, 
          score: 0, 
          currentBid: null, 
          tricksWon: 0, 
          hand: [], 
          isReady: true // Force ready immediately for consistency
      };
      
      const newPlayers = [...gameState.players, bot];
      syncState({
          players: newPlayers,
          currentRoom: { ...gameState.currentRoom!, players: newPlayers }
      });
  };

  const handleReadyNextTrick = () => {
      if (isTutorial && gameState.status === 'trick_summary') {
          cleanupTrick(gameState.trickResult?.winnerId!, gameState.tableCards, gameState.leadSuit, gameState.players);
          return;
      }
      const updatedPlayers = gameState.players.map(p => p.id === localPlayerId ? { ...p, isReady: true } : p);
      syncState({ players: updatedPlayers });
      if (isHost()) {
          if (updatedPlayers.every(p => p.isReady)) {
             setTimeout(() => {
                 if (gameState.status === 'round_end') {
                     const seq = gameState.roundSequence;
                     const nextIdx = gameState.roundIndex + 1;
                     
                     if (nextIdx >= seq.length) {
                         syncState({ status: 'game_over' });
                     } else {
                         const nextRound = seq[nextIdx];
                         const nextStartPlayer = (gameState.startPlayerIndex + 1) % gameState.players.length;
                         const newState: Partial<GameState> = {
                             roundIndex: nextIdx,
                             round: nextRound,
                         };
                         startRoundLogic(nextRound, gameState.players, nextStartPlayer, seq, newState);
                     }
                 } else {
                     cleanupTrick(gameState.trickResult?.winnerId!, gameState.tableCards, gameState.leadSuit, updatedPlayers);
                 }
             }, 300);
         }
      }
  };
  const handleToggleRoundReady = () => {
      handleReadyNextTrick();
  };

  useEffect(() => {
    if (isTutorial) return; 
    if (!isHost()) return; 
    
    // Playing Logic
    if (gameState.currentTurn && ['bidding', 'playing'].includes(gameState.status)) {
      const activePlayer = gameState.players.find(p => p.id === gameState.currentTurn);
      
      if (activePlayer && (activePlayer.id.startsWith('bot-') || activePlayer.id === 'tut-bot')) {
        const timer = setTimeout(() => {
          if (gameState.status === 'bidding') {
             const bid = getBotBid(activePlayer.hand, gameState.trumpCard);
             const updatedPlayers = gameState.players.map(p => 
                p.id === activePlayer.id ? { ...p, currentBid: bid, isReady: true } : p
             );
             
             const nextId = getNextPlayerId(activePlayer.id, gameState.players);
             const startPlayerId = gameState.players[gameState.startPlayerIndex].id;
             const everyoneBid = updatedPlayers.every(p => p.currentBid !== null);

             let nextStatus: GameState['status'] = gameState.status;
             let nextTurn = nextId;
             let nextLeader = gameState.currentTrickLeader;

             if (everyoneBid) {
                nextStatus = 'playing';
                nextTurn = startPlayerId;
                nextLeader = startPlayerId;
             }
             
             syncState({
                players: updatedPlayers,
                status: nextStatus,
                currentTurn: nextTurn,
                currentTrickLeader: nextLeader
             });

          } else if (gameState.status === 'playing') {
             const card = getBotCardToPlay(activePlayer.hand, gameState.leadSuit, gameState.tableCards, gameState.trumpCard);
             const newHand = activePlayer.hand.filter(c => c.id !== card.id);
             const newTableCards = [...gameState.tableCards, { playerId: activePlayer.id, card }];
             const currentLeadSuit = gameState.leadSuit || card.suit;
             const updatedPlayers = gameState.players.map(p => 
                p.id === activePlayer.id ? { ...p, hand: newHand } : p
             );

             const isTrickComplete = newTableCards.length === gameState.players.length;

             if (isTrickComplete) {
                syncState({
                    players: updatedPlayers,
                    tableCards: newTableCards,
                    leadSuit: currentLeadSuit,
                    currentTurn: '' 
                });
                setTimeout(() => announceTrickWinner(newTableCards, currentLeadSuit, updatedPlayers), 800);
             } else {
                syncState({
                    players: updatedPlayers,
                    tableCards: newTableCards,
                    leadSuit: currentLeadSuit,
                    currentTurn: getNextPlayerId(activePlayer.id, gameState.players)
                });
             }
          }
        }, 1000 + Math.random() * 1000); 

        return () => clearTimeout(timer);
      }
    }
    
    // Round Summary / End Logic - Ensure bots are ready
    if (gameState.status === 'round_end' || gameState.status === 'trick_summary') {
        const bots = gameState.players.filter(p => p.id.startsWith('bot-') || p.id === 'tut-bot');
        const unreadyBots = bots.filter(p => !p.isReady);
        
        if (unreadyBots.length > 0) {
             // DELAY bot readiness so user has time to see "Waiting..."
             const timer = setTimeout(() => {
                 const updatedPlayers = gameState.players.map(p => (p.id.startsWith('bot-') || p.id === 'tut-bot') ? { ...p, isReady: true } : p);
                 syncState({ players: updatedPlayers });
             }, 2000); 
             return () => clearTimeout(timer);
        } else {
             // Check if everyone (including humans) is ready to proceed
             const allReady = gameState.players.every(p => p.isReady);
             if (allReady) {
                  const timer = setTimeout(() => {
                      if (gameState.status === 'trick_summary') {
                         cleanupTrick(gameState.trickResult?.winnerId!, gameState.tableCards, gameState.leadSuit, gameState.players);
                      } else {
                         handleReadyNextTrick(); 
                      }
                  }, 500);
                  return () => clearTimeout(timer);
             }
        }
    }

  }, [gameState.currentTurn, gameState.status, gameState.tableCards, gameState.players, isTutorial, tutorialStep]);

  return (
    <CRTOverlay>
      <div className="flex flex-col lg:flex-row w-full h-screen max-w-[1920px] mx-auto text-white relative">
        
        {firebaseError && (
            <div className="absolute top-0 left-0 w-full bg-red-600 text-white z-[9999] flex items-center justify-center gap-2 p-2 font-pixel shadow-lg animate-in slide-in-from-top">
                <AlertTriangle size={20} />
                <span className="uppercase font-bold">{firebaseError} - Jogando em modo Local/Bot.</span>
            </div>
        )}

        {isTutorial && (
            <TutorialOverlay 
                step={tutorialStep} 
                lang={lang} 
                onNext={nextTutorialStep} 
                onClose={() => handleLeaveRoom()} 
                onContinuePlaying={handleTutorialContinuePlaying}
            />
        )}

        {gameState.status === 'menu' && (
           <MainMenu 
               onEnter={handleEnterName} 
               onStartTutorial={startTutorial}
               lang={lang}
               setLang={setLang}
           />
        )}

        {gameState.status === 'room_browser' && (
            <RoomBrowser 
                playerName={localPlayerName} 
                lang={lang}
                onJoinRoom={handleJoinRoom} 
                onCreateRoom={handleCreateRoom}
                onBack={() => setGameState(prev => ({ ...prev, status: 'menu' }))}
                isOfflineMode={isOfflineMode}
            />
        )}

        {gameState.status === 'waiting_room' && gameState.currentRoom && (
            <WaitingRoom 
                room={gameState.currentRoom} 
                localPlayerId={localPlayerId}
                onLeave={handleLeaveRoom}
                onStartGame={handleStartGame}
                onAddBot={handleAddBot}
                onKickPlayer={handleKickPlayer}
                onToggleReady={handleToggleLobbyReady}
                onUpdateSettings={handleUpdateRoomSettings}
            />
        )}

        {['dealing', 'bidding', 'playing', 'trick_result', 'trick_summary', 'round_end'].includes(gameState.status) && (
          <>
            <Sidebar state={gameState} lang={lang} />
            <GameArea 
              gameState={gameState} 
              lang={lang}
              tutorialHighlight={isTutorial ? getHighlightId(tutorialStep) : undefined}
              isTutorial={isTutorial}
              onPlayCard={(c) => isTutorial ? handleTutorialAction('play', c) : playCard(c)}
              onBid={(b) => isTutorial ? handleTutorialAction('bid', b) : submitBid(b)}
              onReadyNextTrick={handleReadyNextTrick}
              onLeave={handleLeaveRoom}
              onTutorialAction={(action) => isTutorial ? handleTutorialAction(action) : null}
            />
          </>
        )}
        
        {(gameState.status === 'round_end' || gameState.status === 'game_over') && gameState.roundResults && (
             <RoundSummary 
                results={gameState.roundResults} 
                players={gameState.players}
                round={gameState.roundIndex + 1}
                totalRounds={gameState.totalRounds}
                onToggleReady={handleToggleRoundReady}
                onLeave={handleLeaveRoom}
                localPlayerId={localPlayerId}
                isGameOver={gameState.status === 'game_over'}
             />
        )}
      </div>
    </CRTOverlay>
  );
};

export default App;
