import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { RoomState, Player, Quiz, ClientAction, ServerMessage, Reaction, PlayerAnswer } from './src/types/quiz';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini client if API key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// In-Memory Room Store
interface ActiveRoom extends RoomState {
  wsClients: Map<string, WebSocket>; // playerId -> ws
  timerInterval?: NodeJS.Timeout;
}

const rooms = new Map<string, ActiveRoom>();

// Helper to generate 6-character room codes
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(room: ActiveRoom, message: ServerMessage) {
  const json = JSON.stringify(message);
  for (const [playerId, client] of room.wsClients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(json);
      } catch (err) {
        console.error(`Error sending message to ${playerId}:`, err);
      }
    }
  }
}

function getSanitizedRoomState(room: ActiveRoom): RoomState {
  // Return room state without sensitive details or internal ws references
  // If in 'question' status, do NOT leak the correctIndex of the active question to prevent client cheating
  const isQuestionActive = room.status === 'question';
  const currentIdx = room.currentQuestionIndex;

  const sanitizedQuestions = room.quiz.questions.map((q, idx) => {
    if (isQuestionActive && idx === currentIdx) {
      return {
        ...q,
        correctIndex: -1, // Hidden while question is active!
        explanation: undefined
      };
    }
    return q;
  });

  return {
    code: room.code,
    quiz: {
      ...room.quiz,
      questions: sanitizedQuestions
    },
    hostId: room.hostId,
    hostPlays: room.hostPlays,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    questionStartTime: room.questionStartTime,
    timeRemaining: room.timeRemaining,
    questionDuration: room.questionDuration,
    countdownRemaining: room.countdownRemaining,
    players: room.players,
    answers: room.answers,
    recentReactions: room.recentReactions
  };
}

function broadcastRoomState(room: ActiveRoom) {
  const state = getSanitizedRoomState(room);
  broadcastToRoom(room, {
    type: 'ROOM_STATE',
    state
  });
}

function checkAllAnswered(room: ActiveRoom) {
  if (room.status !== 'question') return;

  const activePlayers = Object.values(room.players).filter(p => {
    if (!p.connected) return false;
    if (p.isHost && !room.hostPlays) return false; // Host is spectating
    return true;
  });

  if (activePlayers.length === 0) return;

  const allDone = activePlayers.every(p => p.hasAnswered);
  if (allDone) {
    // All answered! Transition immediately to reveal
    transitionToReveal(room);
  }
}

function transitionToReveal(room: ActiveRoom) {
  room.status = 'reveal';
  broadcastRoomState(room);
}

function startAuthoritativeTimer(room: ActiveRoom) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }

  room.timerInterval = setInterval(() => {
    if (room.status === 'countdown') {
      if (typeof room.countdownRemaining === 'number') {
        room.countdownRemaining -= 1;
        if (room.countdownRemaining <= 0) {
          // Switch to question
          room.status = 'question';
          room.countdownRemaining = undefined;
          room.questionStartTime = Date.now();
          room.questionDuration = room.quiz.questions[room.currentQuestionIndex]?.timeLimit || room.quiz.timePerQuestion || 20;
          room.timeRemaining = room.questionDuration;

          // Reset player answers for this question
          for (const pid in room.players) {
            room.players[pid].hasAnswered = false;
            room.players[pid].lastAnswer = undefined;
          }
        }
        broadcastRoomState(room);
      }
    } else if (room.status === 'question') {
      const elapsed = (Date.now() - room.questionStartTime) / 1000;
      const remaining = Math.max(0, Math.ceil(room.questionDuration - elapsed));
      room.timeRemaining = remaining;

      if (remaining <= 0) {
        transitionToReveal(room);
      } else {
        // Broadcast periodic time update if needed
        broadcastRoomState(room);
      }
    }
  }, 1000);
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoint: Create a room
  app.post('/api/rooms', (req, res) => {
    try {
      const { quiz, hostId, hostPlays = true } = req.body as { quiz: Quiz; hostId: string; hostPlays?: boolean };
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return res.status(400).json({ error: 'Quiz must have at least 1 question' });
      }

      let code = generateRoomCode();
      while (rooms.has(code)) {
        code = generateRoomCode();
      }

      const room: ActiveRoom = {
        code,
        quiz,
        hostId,
        hostPlays,
        status: 'lobby',
        currentQuestionIndex: 0,
        questionStartTime: 0,
        timeRemaining: quiz.timePerQuestion || 20,
        questionDuration: quiz.timePerQuestion || 20,
        players: {},
        answers: {},
        recentReactions: [],
        wsClients: new Map()
      };

      rooms.set(code, room);
      console.log(`Room created: ${code} by ${hostId}`);

      return res.json({ code, room: getSanitizedRoomState(room) });
    } catch (err: unknown) {
      console.error('Failed to create room:', err);
      return res.status(500).json({ error: 'Failed to create room' });
    }
  });

  // API endpoint: Get room status
  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    return res.json({
      code: room.code,
      title: room.quiz.title,
      description: room.quiz.description,
      questionCount: room.quiz.questions.length,
      playerCount: Object.keys(room.players).length,
      status: room.status
    });
  });

  // API endpoint: Optional direct Gemini Generation if GEMINI_API_KEY is available
  app.post('/api/gemini/generate-quiz', async (req, res) => {
    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please use the Prompt Copy-Paste feature with your favorite AI!'
      });
    }

    try {
      const { topic = 'General Knowledge', count = 5, difficulty = 'Medium', style = 'Classic Trivia' } = req.body;

      const prompt = `Generate a high-energy multiplayer quiz with ${count} questions about "${topic}".
Difficulty: ${difficulty}. Style: ${style}.
Each question MUST have exactly 4 choices, with 1 correct choice (correctIndex from 0 to 3), and a short, fun explanation.`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              timePerQuestion: { type: Type.INTEGER },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ['question', 'options', 'correctIndex', 'explanation']
                }
              }
            },
            required: ['title', 'description', 'questions']
          }
        }
      });

      if (!response.text) {
        throw new Error('No text returned from Gemini API');
      }

      const quizData = JSON.parse(response.text);
      quizData.id = `quiz_gemini_${Date.now()}`;
      quizData.timePerQuestion = quizData.timePerQuestion || 20;

      // Ensure question IDs
      quizData.questions = (quizData.questions || []).map((q: Record<string, unknown>, i: number) => ({
        ...q,
        id: `q_${i + 1}_${Math.random().toString(36).substring(2, 6)}`
      }));

      return res.json({ quiz: quizData });
    } catch (err: unknown) {
      console.error('Gemini generation error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate quiz via Gemini'
      });
    }
  });

  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (data: string) => {
      try {
        const action = JSON.parse(data.toString()) as ClientAction;

        if (action.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        if (action.type === 'JOIN_ROOM') {
          const roomCode = action.roomCode.toUpperCase();
          const room = rooms.get(roomCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Room ${roomCode} not found.` }));
            return;
          }

          currentRoomCode = roomCode;
          currentPlayerId = action.playerId;

          room.wsClients.set(action.playerId, ws);

          const isHost = action.isHost || (action.playerId === room.hostId) || Object.keys(room.players).length === 0;
          if (isHost && !room.hostId) {
            room.hostId = action.playerId;
          }

          // Existing player reconnect or new player
          if (room.players[action.playerId]) {
            room.players[action.playerId].connected = true;
            room.players[action.playerId].name = action.name || room.players[action.playerId].name;
            room.players[action.playerId].avatar = action.avatar || room.players[action.playerId].avatar;
            room.players[action.playerId].color = action.color || room.players[action.playerId].color;
          } else {
            const newPlayer: Player = {
              id: action.playerId,
              name: action.name || `Player ${Object.keys(room.players).length + 1}`,
              avatar: action.avatar || '⚡',
              color: action.color || '#6366f1',
              isHost,
              isReady: isHost, // Host is ready by default
              score: 0,
              streak: 0,
              highestStreak: 0,
              hasAnswered: false,
              connected: true,
              totalCorrect: 0,
              totalTimeTaken: 0
            };
            room.players[action.playerId] = newPlayer;
          }

          broadcastRoomState(room);
          console.log(`Player ${action.playerId} joined room ${roomCode}`);
        }

        if (!currentRoomCode || !currentPlayerId) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        if (action.type === 'TOGGLE_READY') {
          const player = room.players[action.playerId];
          if (player) {
            player.isReady = !player.isReady;
            broadcastRoomState(room);
          }
        }

        if (action.type === 'UPDATE_PLAYER') {
          const player = room.players[action.playerId];
          if (player) {
            if (action.name) player.name = action.name;
            if (action.avatar) player.avatar = action.avatar;
            if (action.color) player.color = action.color;
            broadcastRoomState(room);
          }
        }

        if (action.type === 'UPDATE_SETTINGS') {
          if (currentPlayerId === room.hostId) {
            if (typeof action.timePerQuestion === 'number') {
              room.quiz.timePerQuestion = action.timePerQuestion;
              room.questionDuration = action.timePerQuestion;
            }
            if (typeof action.hostPlays === 'boolean') {
              room.hostPlays = action.hostPlays;
            }
            broadcastRoomState(room);
          }
        }

        if (action.type === 'START_GAME') {
          if (currentPlayerId === room.hostId) {
            room.currentQuestionIndex = 0;
            room.answers = {};
            for (const pid in room.players) {
              room.players[pid].score = 0;
              room.players[pid].streak = 0;
              room.players[pid].highestStreak = 0;
              room.players[pid].hasAnswered = false;
              room.players[pid].lastAnswer = undefined;
              room.players[pid].totalCorrect = 0;
              room.players[pid].totalTimeTaken = 0;
            }

            room.status = 'countdown';
            room.countdownRemaining = 3;
            startAuthoritativeTimer(room);
            broadcastRoomState(room);
          }
        }

        if (action.type === 'SUBMIT_ANSWER') {
          if (room.status !== 'question') return;
          if (action.questionIndex !== room.currentQuestionIndex) return;

          const player = room.players[action.playerId];
          if (!player || player.hasAnswered) return;

          const currentQuestion = room.quiz.questions[room.currentQuestionIndex];
          if (!currentQuestion) return;

          const isCorrect = action.optionIndex === currentQuestion.correctIndex;
          const timeTaken = Math.max(0.1, (Date.now() - room.questionStartTime) / 1000);
          const duration = room.questionDuration || 20;
          const timeFraction = Math.max(0, 1 - (timeTaken / duration));

          let points = 0;
          const streakBefore = player.streak;

          if (isCorrect) {
            // Gamified Kahoot-style scoring:
            // Base 500 + up to 500 speed bonus + streak multiplier
            const basePoints = 500;
            const speedBonus = Math.round(500 * timeFraction);
            let multiplier = 1.0;
            if (streakBefore === 1) multiplier = 1.15;
            else if (streakBefore === 2) multiplier = 1.35;
            else if (streakBefore >= 3) multiplier = 1.5;

            points = Math.round((basePoints + speedBonus) * multiplier);

            player.streak += 1;
            if (player.streak > player.highestStreak) {
              player.highestStreak = player.streak;
            }
            player.totalCorrect += 1;
          } else {
            player.streak = 0;
          }

          player.score += points;
          player.totalTimeTaken += timeTaken;
          player.hasAnswered = true;

          const answerRecord: PlayerAnswer = {
            optionIndex: action.optionIndex,
            timeTaken,
            isCorrect,
            points,
            streakBefore
          };

          player.lastAnswer = answerRecord;

          if (!room.answers[room.currentQuestionIndex]) {
            room.answers[room.currentQuestionIndex] = {};
          }
          room.answers[room.currentQuestionIndex][action.playerId] = answerRecord;

          // Check if everyone has answered
          checkAllAnswered(room);

          broadcastRoomState(room);
        }

        if (action.type === 'SHOW_LEADERBOARD') {
          if (currentPlayerId === room.hostId && room.status === 'reveal') {
            room.status = 'leaderboard';
            broadcastRoomState(room);
          }
        }

        if (action.type === 'NEXT_QUESTION') {
          if (currentPlayerId === room.hostId && (room.status === 'reveal' || room.status === 'leaderboard')) {
            if (room.currentQuestionIndex + 1 < room.quiz.questions.length) {
              room.currentQuestionIndex += 1;
              room.status = 'countdown';
              room.countdownRemaining = 3;
              for (const pid in room.players) {
                room.players[pid].hasAnswered = false;
                room.players[pid].lastAnswer = undefined;
              }
              startAuthoritativeTimer(room);
              broadcastRoomState(room);
            } else {
              // Quiz Finished!
              room.status = 'gameover';
              if (room.timerInterval) clearInterval(room.timerInterval);
              broadcastRoomState(room);
            }
          }
        }

        if (action.type === 'RESTART_GAME') {
          if (currentPlayerId === room.hostId) {
            room.currentQuestionIndex = 0;
            room.answers = {};
            for (const pid in room.players) {
              room.players[pid].score = 0;
              room.players[pid].streak = 0;
              room.players[pid].highestStreak = 0;
              room.players[pid].hasAnswered = false;
              room.players[pid].lastAnswer = undefined;
              room.players[pid].totalCorrect = 0;
              room.players[pid].totalTimeTaken = 0;
            }
            room.status = 'lobby';
            if (room.timerInterval) clearInterval(room.timerInterval);
            broadcastRoomState(room);
          }
        }

        if (action.type === 'SEND_REACTION') {
          const player = room.players[action.playerId];
          if (player) {
            const reaction: Reaction = {
              id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              playerId: action.playerId,
              playerName: player.name,
              emoji: action.emoji,
              timestamp: Date.now()
            };
            room.recentReactions = [reaction, ...room.recentReactions.slice(0, 15)];
            broadcastToRoom(room, {
              type: 'REACTION',
              reaction
            });
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.wsClients.delete(currentPlayerId);
          if (room.players[currentPlayerId]) {
            room.players[currentPlayerId].connected = false;
          }
          broadcastRoomState(room);

          // If no active connections left, clean up room after 10 minutes
          const activeConnections = Array.from(room.wsClients.values()).filter(c => c.readyState === WebSocket.OPEN);
          if (activeConnections.length === 0) {
            setTimeout(() => {
              const checkRoom = rooms.get(currentRoomCode!);
              if (checkRoom && checkRoom.wsClients.size === 0) {
                if (checkRoom.timerInterval) clearInterval(checkRoom.timerInterval);
                rooms.delete(currentRoomCode!);
                console.log(`Cleaned up empty room ${currentRoomCode}`);
              }
            }, 600000);
          }
        }
      }
    });
  });

  // Serve static assets in production or mount Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(Number(port), '0.0.0.0', () => {
    console.log(`🚀 MindClash Server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
