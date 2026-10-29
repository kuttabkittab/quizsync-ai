import { useState, useEffect, useRef, useCallback } from 'react';
import { RoomState, ClientAction, ServerMessage, Player, Reaction } from '../types/quiz';
import { sounds } from '../utils/sound';

export function useQuizSocket(initialRoomCode?: string) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or retrieve persistent playerId from sessionStorage
  const [playerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('mindclash_player_id');
      if (stored) return stored;
      const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('mindclash_player_id', newId);
      return newId;
    }
    return `p_${Date.now()}`;
  });

  const sendAction = useCallback((action: ClientAction) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(action));
    }
  }, []);

  const connect = useCallback((roomCode: string, playerDetails?: { name?: string; avatar?: string; color?: string; isHost?: boolean }) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);

      // Join room once connected
      const storedName = sessionStorage.getItem('mindclash_player_name') || 'Player';
      const storedAvatar = sessionStorage.getItem('mindclash_player_avatar') || '⚡';
      const storedColor = sessionStorage.getItem('mindclash_player_color') || '#6366f1';

      ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomCode,
        playerId,
        name: playerDetails?.name || storedName,
        avatar: playerDetails?.avatar || storedAvatar,
        color: playerDetails?.color || storedColor,
        isHost: playerDetails?.isHost
      }));

      // Start ping heartbeat
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        if (msg.type === 'ROOM_STATE') {
          setRoomState(prevState => {
            // Trigger sound effects on specific state transitions
            if (prevState) {
              if (prevState.status !== 'countdown' && msg.state.status === 'countdown') {
                sounds.playStart();
              } else if (prevState.status === 'countdown' && msg.state.status === 'question') {
                sounds.playTick();
              } else if (prevState.status === 'question' && msg.state.status === 'reveal') {
                // Check if our player was correct
                const myAnswer = msg.state.players[playerId]?.lastAnswer;
                if (myAnswer) {
                  if (myAnswer.isCorrect) {
                    sounds.playCorrect();
                    if (myAnswer.streakBefore >= 2) {
                      setTimeout(() => sounds.playStreak(), 250);
                    }
                  } else {
                    sounds.playIncorrect();
                  }
                }
              } else if (prevState.status !== 'gameover' && msg.state.status === 'gameover') {
                sounds.playVictory();
              }

              // Check if a new player joined
              const prevPlayerCount = Object.keys(prevState.players).length;
              const newPlayerCount = Object.keys(msg.state.players).length;
              if (newPlayerCount > prevPlayerCount) {
                sounds.playJoin();
              }
            }
            return msg.state;
          });
        } else if (msg.type === 'REACTION') {
          setReactions(prev => [msg.reaction, ...prev.slice(0, 20)]);
        } else if (msg.type === 'ERROR') {
          setError(msg.message);
        }
      } catch (err) {
        console.error('WebSocket message parsing failed:', err);
      }
    };

    ws.onerror = () => {
      setError('Connection to quiz server failed. Reconnecting...');
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [playerId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    setRoomState(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (initialRoomCode) {
      connect(initialRoomCode);
    }
    return () => {
      disconnect();
    };
  }, [initialRoomCode, connect, disconnect]);

  const localPlayer: Player | undefined = roomState?.players[playerId];

  return {
    playerId,
    localPlayer,
    roomState,
    isConnected,
    error,
    reactions,
    connect,
    disconnect,
    sendAction
  };
}
