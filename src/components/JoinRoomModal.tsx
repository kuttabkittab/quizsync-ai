import React, { useState, useEffect } from 'react';
import { LogIn, User, Sparkles, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { sounds } from '../utils/sound';

interface JoinRoomModalProps {
  initialRoomCode?: string;
  onJoin: (details: { roomCode: string; name: string; avatar: string; color: string }) => void;
  isLoading?: boolean;
}

const AVATARS = ['⚡', '🚀', '🤖', '🦊', '🦁', '🧙‍♂️', '🎯', '👾', '🦄', '🐱', '👑', '🔥', '🏆', '💎'];
const COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Purple', hex: '#a855f7' }
];

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ initialRoomCode = '', onJoin, isLoading }) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [name, setName] = useState(() => {
    return sessionStorage.getItem('mindclash_player_name') || `Challenger_${Math.floor(Math.random() * 900 + 100)}`;
  });
  const [avatar, setAvatar] = useState(() => {
    return sessionStorage.getItem('mindclash_player_avatar') || AVATARS[Math.floor(Math.random() * AVATARS.length)];
  });
  const [color, setColor] = useState(() => {
    return sessionStorage.getItem('mindclash_player_color') || COLORS[0].hex;
  });

  const [roomInfo, setRoomInfo] = useState<{ title: string; questionCount: number; playerCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Auto-validate room code when 6 chars
  useEffect(() => {
    if (roomCode.length === 6) {
      setIsValidating(true);
      setError(null);
      fetch(`/api/rooms/${roomCode}`)
        .then(res => {
          if (!res.ok) throw new Error('Room not found. Check the code and try again.');
          return res.json();
        })
        .then(data => {
          setRoomInfo(data);
          setError(null);
        })
        .catch(err => {
          setRoomInfo(null);
          setError(err.message || 'Room not found');
        })
        .finally(() => setIsValidating(false));
    } else {
      setRoomInfo(null);
    }
  }, [roomCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || roomCode.length < 4) {
      setError('Please enter a valid room code');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your player nickname');
      return;
    }

    sessionStorage.setItem('mindclash_player_name', name.trim());
    sessionStorage.setItem('mindclash_player_avatar', avatar);
    sessionStorage.setItem('mindclash_player_color', color);

    sounds.playJoin();
    onJoin({
      roomCode: roomCode.trim().toUpperCase(),
      name: name.trim(),
      avatar,
      color
    });
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/25 mb-3 ring-1 ring-white/20">
          {avatar}
        </div>
        <h2 className="text-2xl font-extrabold text-white">Join Quiz Arena</h2>
        <p className="text-xs text-slate-400 mt-1">Enter room code and prepare to battle</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Code */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            6-Digit Room Code
          </label>
          <input
            type="text"
            maxLength={6}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. K9X4M2"
            required
            className="w-full text-center font-mono font-extrabold text-2xl tracking-widest px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white outline-none uppercase placeholder:text-slate-600 transition-all"
          />
        </div>

        {/* Room Info preview */}
        {roomInfo && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
            <div>
              <p className="font-bold">{roomInfo.title}</p>
              <p className="text-emerald-400/70">{roomInfo.questionCount} Questions • {roomInfo.playerCount} Players joined</p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
        )}

        {/* Player Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Your Nickname
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. QuizMaster99"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-indigo-500 text-sm font-semibold text-white outline-none placeholder:text-slate-600"
            />
            <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          </div>
        </div>

        {/* Avatar Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Pick Your Avatar
          </label>
          <div className="grid grid-cols-7 gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`h-9 rounded-lg flex items-center justify-center text-lg transition-transform ${
                  avatar === emoji
                    ? 'bg-indigo-600 scale-110 shadow-md ring-2 ring-indigo-400'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Theme Color
          </label>
          <div className="flex gap-2.5 justify-center py-1">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  color === c.hex ? 'ring-4 ring-white/30 scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {color === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isValidating}
          className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {isLoading ? (
            <span>Connecting to Arena...</span>
          ) : (
            <>
              <span>Enter Arena</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
