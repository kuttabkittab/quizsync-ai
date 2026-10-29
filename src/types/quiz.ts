export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number; // 0 to options.length - 1
  explanation?: string;
  timeLimit?: number; // optional per-question time limit in seconds
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  category?: string;
  questions: Question[];
  timePerQuestion: number; // default seconds, e.g. 20
}

export interface PlayerAnswer {
  optionIndex: number;
  timeTaken: number; // in seconds
  isCorrect: boolean;
  points: number;
  streakBefore: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // emoji icon
  color: string; // hex or tailwind color
  isHost: boolean;
  isReady: boolean;
  score: number;
  streak: number;
  highestStreak: number;
  hasAnswered: boolean;
  lastAnswer?: PlayerAnswer;
  connected: boolean;
  totalCorrect: number;
  totalTimeTaken: number;
}

export type RoomStatus =
  | 'lobby'
  | 'countdown'
  | 'question'
  | 'reveal'
  | 'leaderboard'
  | 'gameover';

export interface Reaction {
  id: string;
  playerId: string;
  playerName: string;
  emoji: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  quiz: Quiz;
  hostId: string;
  hostPlays: boolean;
  status: RoomStatus;
  currentQuestionIndex: number;
  questionStartTime: number; // epoch ms
  timeRemaining: number; // seconds remaining
  questionDuration: number; // in seconds
  countdownRemaining?: number; // 3, 2, 1
  players: Record<string, Player>;
  answers: Record<number, Record<string, PlayerAnswer>>;
  recentReactions: Reaction[];
}

export type ClientAction =
  | { type: 'JOIN_ROOM'; roomCode: string; playerId: string; name: string; avatar: string; color: string; isHost?: boolean }
  | { type: 'TOGGLE_READY'; roomCode: string; playerId: string }
  | { type: 'UPDATE_PLAYER'; roomCode: string; playerId: string; name?: string; avatar?: string; color?: string }
  | { type: 'UPDATE_SETTINGS'; roomCode: string; timePerQuestion?: number; hostPlays?: boolean }
  | { type: 'START_GAME'; roomCode: string; hostId: string }
  | { type: 'SUBMIT_ANSWER'; roomCode: string; playerId: string; questionIndex: number; optionIndex: number }
  | { type: 'SHOW_LEADERBOARD'; roomCode: string; hostId: string }
  | { type: 'NEXT_QUESTION'; roomCode: string; hostId: string }
  | { type: 'RESTART_GAME'; roomCode: string; hostId: string }
  | { type: 'SEND_REACTION'; roomCode: string; playerId: string; emoji: string }
  | { type: 'PING' };

export type ServerMessage =
  | { type: 'ROOM_STATE'; state: RoomState }
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'REACTION'; reaction: Reaction }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' };
