import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, HelpCircle, LogOut, Copy, Check, Users } from 'lucide-react';
import { sounds } from '../utils/sound';

interface HeaderProps {
  roomCode?: string;
  playerCount?: number;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ roomCode, playerCount, onLeaveRoom }) => {
  const [muted, setMuted] = useState(sounds.isMuted);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const toggleSound = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sounds.playTick();
    }
  };

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-slate-400">
                  MindClash
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  AI Arena
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Multiplayer Real-Time Quiz Showdown
              </p>
            </div>
          </div>

          {/* Center Info / Active Room Badge */}
          {roomCode && (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-indigo-500/30 px-3 py-1.5 rounded-xl shadow-inner shadow-black/40">
              <span className="text-xs text-slate-400 font-medium">Room:</span>
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 font-mono font-bold text-sm tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                title="Click to copy room code"
              >
                {roomCode}
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {typeof playerCount === 'number' && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-700 text-xs text-slate-300 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{playerCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="How to create & play AI quizzes"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-colors ${
                muted
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {roomCode && onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave Room</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Guide Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">How MindClash Works</h2>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  <p className="font-semibold text-white">Generate Your AI Prompt</p>
                  <p className="text-slate-400 text-xs mt-0.5">Pick any topic (or type a custom one), difficulty, and question count. Click <strong>Copy Prompt</strong>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  <p className="font-semibold text-white">Paste into ANY AI</p>
                  <p className="text-slate-400 text-xs mt-0.5">Paste the prompt into ChatGPT, Claude, Gemini, DeepSeek, or any model of your choice. Copy whatever it replies!</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  <p className="font-semibold text-white">Paste & Create Room</p>
                  <p className="text-slate-400 text-xs mt-0.5">Paste the AI's reply into MindClash. Our smart parser instantly validates it and creates your live multiplayer arena.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">4</div>
                <div>
                  <p className="font-semibold text-white">Battle with Real-Time Scoring</p>
                  <p className="text-slate-400 text-xs mt-0.5">Invite friends with your 6-digit room code or share link. Faster answers yield higher speed bonuses and streak multipliers!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white transition-colors"
            >
              Got it, let's play!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
