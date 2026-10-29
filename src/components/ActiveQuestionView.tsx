import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Zap, CheckCircle, Flame, Send, Users } from 'lucide-react';
import { RoomState, Player } from '../types/quiz';
import { sounds } from '../utils/sound';

interface ActiveQuestionViewProps {
  roomState: RoomState;
  localPlayer?: Player;
  onSubmitAnswer: (optionIndex: number) => void;
  onSendReaction: (emoji: string) => void;
}

const OPTION_STYLES = [
  {
    bg: 'bg-red-500 hover:bg-red-600',
    border: 'border-red-400/40',
    ring: 'ring-red-400',
    selectedBg: 'bg-red-600 ring-4 ring-white',
    symbol: '▲',
    label: 'A'
  },
  {
    bg: 'bg-blue-600 hover:bg-blue-700',
    border: 'border-blue-400/40',
    ring: 'ring-blue-400',
    selectedBg: 'bg-blue-700 ring-4 ring-white',
    symbol: '◆',
    label: 'B'
  },
  {
    bg: 'bg-amber-500 hover:bg-amber-600',
    border: 'border-amber-400/40',
    ring: 'ring-amber-400',
    selectedBg: 'bg-amber-600 ring-4 ring-white',
    symbol: '●',
    label: 'C'
  },
  {
    bg: 'bg-emerald-600 hover:bg-emerald-700',
    border: 'border-emerald-400/40',
    ring: 'ring-emerald-400',
    selectedBg: 'bg-emerald-700 ring-4 ring-white',
    symbol: '■',
    label: 'D'
  }
];

const REACTION_EMOJIS = ['🔥', '🤯', '😂', '👏', '💀', '🚀'];

export const ActiveQuestionView: React.FC<ActiveQuestionViewProps> = ({
  roomState,
  localPlayer,
  onSubmitAnswer,
  onSendReaction
}) => {
  const currentQ = roomState.quiz.questions[roomState.currentQuestionIndex];
  const totalQuestions = roomState.quiz.questions.length;
  const isSpectatingHost = localPlayer?.isHost && !roomState.hostPlays;

  const hasAnswered = localPlayer?.hasAnswered || false;
  const selectedIndex = localPlayer?.lastAnswer?.optionIndex;

  const timeRemaining = roomState.timeRemaining;
  const totalDuration = roomState.questionDuration || 20;
  const percentRemaining = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));

  // Audio countdown alert on last 3 seconds
  useEffect(() => {
    if (timeRemaining <= 3 && timeRemaining > 0 && roomState.status === 'question') {
      sounds.playCountdownAlert();
    }
  }, [timeRemaining, roomState.status]);

  // Keyboard shortcuts (1, 2, 3, 4 or A, B, C, D)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (hasAnswered || isSpectatingHost) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === '1' || e.key.toLowerCase() === 'a') {
      onSubmitAnswer(0);
      sounds.playTick();
    } else if (e.key === '2' || e.key.toLowerCase() === 'b') {
      onSubmitAnswer(1);
      sounds.playTick();
    } else if (e.key === '3' || e.key.toLowerCase() === 'c') {
      onSubmitAnswer(2);
      sounds.playTick();
    } else if (e.key === '4' || e.key.toLowerCase() === 'd') {
      onSubmitAnswer(3);
      sounds.playTick();
    }
  }, [hasAnswered, isSpectatingHost, onSubmitAnswer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOptionClick = (idx: number) => {
    if (hasAnswered || isSpectatingHost) return;
    onSubmitAnswer(idx);
    sounds.playTick();
  };

  // Participant answer progress
  const activePlayers = Object.values(roomState.players).filter(p => p.connected && (!p.isHost || roomState.hostPlays));
  const answeredCount = activePlayers.filter(p => p.hasAnswered).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Status Bar: Question Progress, Points, Streak */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl px-5 py-3 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Q {roomState.currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[200px]">
            {roomState.quiz.title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Answered Progress */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{answeredCount}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{activePlayers.length} in</span>
          </div>

          {/* Current Score & Streak */}
          {localPlayer && !isSpectatingHost && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              {localPlayer.streak > 1 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{localPlayer.streak}x</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block -mb-1">SCORE</span>
                <span className="font-mono font-extrabold text-sm text-yellow-400">
                  {localPlayer.score.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden shadow-inner">
        <div
          style={{ width: `${percentRemaining}%` }}
          className={`h-full rounded-full transition-all duration-300 ${
            timeRemaining <= 5
              ? 'bg-rose-500 animate-pulse'
              : timeRemaining <= 10
              ? 'bg-amber-400'
              : 'bg-emerald-400'
          }`}
        />
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-md shadow-2xl relative text-center">
        {/* Floating Timer Badge */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-xl shadow-lg border transition-all ${
              timeRemaining <= 5
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-ping'
                : 'bg-slate-950 border-slate-700 text-white'
            }`}
          >
            {timeRemaining}
          </div>
        </div>

        <div className="max-w-2xl mx-auto py-4">
          <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-snug tracking-tight">
            {currentQ?.question}
          </h2>
        </div>

        {/* Lock-in message if user answered */}
        {hasAnswered && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4" />
            <span>Answer locked in! Waiting for others to finish...</span>
          </div>
        )}

        {isSpectatingHost && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
            <span>You are spectating as host. Watch players answer live!</span>
          </div>
        )}
      </div>

      {/* 4 Answer Choice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {currentQ?.options.map((option, idx) => {
          const style = OPTION_STYLES[idx % OPTION_STYLES.length];
          const isSelected = selectedIndex === idx;

          return (
            <button
              key={idx}
              type="button"
              disabled={hasAnswered || isSpectatingHost}
              onClick={() => handleOptionClick(idx)}
              className={`min-h-[90px] p-5 rounded-2xl text-left font-bold text-white shadow-xl transition-all relative flex items-center justify-between gap-4 ${
                isSelected
                  ? style.selectedBg + ' scale-[1.02] shadow-2xl'
                  : hasAnswered
                  ? 'bg-slate-900/60 border border-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                  : `${style.bg} border ${style.border} hover:scale-[1.02] active:scale-[0.98]`
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-black/25 flex items-center justify-center font-black text-sm shrink-0">
                  {style.symbol}
                </span>
                <span className="text-base sm:text-lg tracking-tight leading-snug">
                  {option}
                </span>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/20 text-white/70 hidden sm:inline">
                  [{idx + 1}]
                </span>
                {isSelected && (
                  <CheckCircle className="w-6 h-6 text-white shrink-0 animate-bounce" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Reactions Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 pl-2">
          React Live:
        </span>
        <div className="flex items-center gap-2">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSendReaction(emoji);
                sounds.playTick();
              }}
              className="w-9 h-9 rounded-xl bg-slate-950/80 hover:bg-slate-800 hover:scale-125 active:scale-95 transition-all text-lg flex items-center justify-center border border-slate-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
