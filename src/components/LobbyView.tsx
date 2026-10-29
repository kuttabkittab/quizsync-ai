import React, { useState } from 'react';
import { Copy, Check, Users, Play, Sparkles, Crown, Clock, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { RoomState, Player } from '../types/quiz';
import { sounds } from '../utils/sound';

interface LobbyViewProps {
  roomState: RoomState;
  localPlayer?: Player;
  onStartGame: () => void;
  onToggleReady: () => void;
  onUpdateSettings: (settings: { timePerQuestion?: number; hostPlays?: boolean }) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomState,
  localPlayer,
  onStartGame,
  onToggleReady,
  onUpdateSettings
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = localPlayer?.isHost ?? false;
  const players = Object.values(roomState.players);
  const readyCount = players.filter(p => p.isReady).length;
  const totalCount = players.length;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${roomState.code}`
    : `?room=${roomState.code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setCopiedCode(true);
    sounds.playTick();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    sounds.playTick();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openSecondPlayerTab = () => {
    window.open(inviteUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner: Quiz Info & Room Code */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {roomState.quiz.category || 'Multiplayer Quiz'}
              </span>
              <span className="text-xs text-slate-400">
                {roomState.quiz.questions.length} Questions
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {roomState.quiz.title}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              {roomState.quiz.description || 'Join the arena and battle for the top of the leaderboard!'}
            </p>
          </div>

          {/* Big Room Code Box */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Room Code
            </span>
            <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/40 rounded-2xl p-2.5 shadow-inner">
              <span className="font-mono font-black text-3xl tracking-widest text-indigo-400 px-3">
                {roomState.code}
              </span>
              <button
                onClick={copyCode}
                className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                title="Copy Room Code"
              >
                {copiedCode ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>

              {/* Direct 2nd tab helper for fast 2-player testing! */}
              <button
                onClick={openSecondPlayerTab}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold border border-violet-500/30 transition-colors"
                title="Open a second player in a new browser tab to test multiplayer right now"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test in 2nd Tab</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Joined Players & Host Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Players List (2 columns on md) */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Joined Players</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                {players.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {readyCount} of {totalCount} ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {players.map((p) => {
              const isMe = p.id === localPlayer?.id;
              return (
                <div
                  key={p.id}
                  style={{ borderColor: p.color + '55' }}
                  className={`p-3.5 rounded-xl border bg-slate-950/70 flex items-center justify-between gap-3 transition-all ${
                    isMe ? 'ring-1 ring-indigo-500/60 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{ backgroundColor: p.color + '22', borderColor: p.color }}
                      className="w-11 h-11 rounded-xl border flex items-center justify-center text-xl shrink-0 shadow-sm"
                    >
                      {p.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate">{p.name}</span>
                        {p.isHost && (
                          <span title="Host">
                            <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {p.connected ? 'Connected' : 'Offline'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {p.isReady ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
                        Waiting
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar for Non-Hosts */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {isHost ? 'You are the host of this arena.' : 'Waiting for host to start the quiz...'}
            </span>
            <button
              onClick={onToggleReady}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                localPlayer?.isReady
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
              }`}
            >
              {localPlayer?.isReady ? 'Cancel Ready' : 'I Am Ready! ⚡'}
            </button>
          </div>
        </div>

        {/* Host Controls & Arena Settings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-bold text-white">Arena Settings</h2>
            </div>

            <div className="space-y-4">
              {/* Question Timer */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Timer per Question
                  </span>
                  <span className="text-indigo-400 font-mono font-bold">
                    {roomState.quiz.timePerQuestion || 20}s
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 15, 20, 30].map((t) => (
                    <button
                      key={t}
                      disabled={!isHost}
                      onClick={() => onUpdateSettings({ timePerQuestion: t })}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        (roomState.quiz.timePerQuestion || 20) === t
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                      } ${!isHost ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Participation Toggle */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomState.hostPlays}
                    disabled={!isHost}
                    onChange={(e) => onUpdateSettings({ hostPlays: e.target.checked })}
                    className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">Host Plays As Competitor</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enable so the host can also submit answers and earn points.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Start Game Button (Host Only) */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={players.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START QUIZ ARENA 🚀</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                <p className="text-xs font-bold text-indigo-300">Ready to play!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">The host will launch when all players join.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
