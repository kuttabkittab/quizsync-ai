import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Flame, Zap, Target, RotateCcw, PlusCircle, Medal } from 'lucide-react';
import { RoomState, Player } from '../types/quiz';
import { sounds } from '../utils/sound';

interface GameOverViewProps {
  roomState: RoomState;
  localPlayer?: Player;
  onRestart: () => void;
  onNewQuiz: () => void;
}

export const GameOverView: React.FC<GameOverViewProps> = ({
  roomState,
  localPlayer,
  onRestart,
  onNewQuiz
}) => {
  const isHost = localPlayer?.isHost ?? false;
  const rankedPlayers = Object.values(roomState.players).sort((a, b) => b.score - a.score);
  const totalQuestions = roomState.quiz.questions.length;

  const winner = rankedPlayers[0];
  const runnerUp = rankedPlayers[1];
  const thirdPlace = rankedPlayers[2];

  // Trigger grand confetti shower
  useEffect(() => {
    sounds.playVictory();

    // Multiphase celebratory confetti blast
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  // Calculate MVP awards with useMemo
  const { speedDemon, sharpshooter, streakMaster } = React.useMemo(() => {
    let sDemon: Player | null = null;
    let minTime = Infinity;
    let sShooter: Player | null = null;
    let mCorrect = 0;
    let sMaster: Player | null = null;
    let mStreak = 0;

    for (const p of rankedPlayers) {
      if (p.totalCorrect > 0) {
        const avgTime = p.totalTimeTaken / p.totalCorrect;
        if (avgTime < minTime) {
          minTime = avgTime;
          sDemon = p;
        }
      }
      if (p.totalCorrect > mCorrect) {
        mCorrect = p.totalCorrect;
        sShooter = p;
      }
      if (p.highestStreak > mStreak) {
        mStreak = p.highestStreak;
        sMaster = p;
      }
    }

    return { speedDemon: sDemon, sharpshooter: sShooter, streakMaster: sMaster };
  }, [rankedPlayers]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-black uppercase tracking-widest">
          <Trophy className="w-3.5 h-3.5" />
          <span>Game Over • Final Results</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Arena Champions
        </h1>
        <p className="text-sm text-slate-300">
          {roomState.quiz.title} • {totalQuestions} Questions Completed
        </p>
      </div>

      {/* Olympic Victory Podium */}
      {rankedPlayers.length > 0 && (
        <div className="pt-8 pb-4">
          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-xl mx-auto px-4">
            {/* 2nd Place (Silver) */}
            {runnerUp && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border-2 border-slate-400 flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-lg shadow-black/50 relative">
                  {runnerUp.avatar}
                  <span className="absolute -top-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-400 text-slate-950 uppercase">
                    2ND
                  </span>
                </div>
                <p className="font-bold text-sm text-white truncate max-w-[100px] text-center">
                  {runnerUp.name}
                </p>
                <p className="font-mono text-xs text-yellow-400 font-extrabold mb-2">
                  {runnerUp.score.toLocaleString()}
                </p>
                <div className="w-full h-28 sm:h-36 rounded-t-2xl bg-gradient-to-t from-slate-900 to-slate-800 border-t-2 border-slate-400 flex items-center justify-center text-slate-400 font-black text-2xl shadow-xl">
                  🥈
                </div>
              </div>
            )}

            {/* 1st Place (Gold Winner) */}
            {winner && (
              <div className="flex-1 flex flex-col items-center -mt-6">
                <div className="relative mb-2">
                  <Crown className="w-8 h-8 text-yellow-400 absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/20 border-2 border-yellow-400 flex items-center justify-center text-3xl sm:text-4xl shadow-2xl shadow-yellow-500/30 ring-4 ring-yellow-400/30">
                    {winner.avatar}
                  </div>
                </div>
                <p className="font-extrabold text-base text-yellow-300 truncate max-w-[120px] text-center">
                  {winner.name}
                </p>
                <p className="font-mono text-sm text-yellow-400 font-black mb-2">
                  {winner.score.toLocaleString()} PTS
                </p>
                <div className="w-full h-40 sm:h-48 rounded-t-2xl bg-gradient-to-t from-yellow-950/60 via-amber-900/40 to-yellow-600/30 border-t-4 border-yellow-400 flex items-center justify-center text-3xl shadow-2xl shadow-yellow-500/20">
                  🥇
                </div>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {thirdPlace && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border-2 border-amber-600 flex items-center justify-center text-2xl sm:text-3xl mb-2 shadow-lg shadow-black/50 relative">
                  {thirdPlace.avatar}
                  <span className="absolute -top-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-white uppercase">
                    3RD
                  </span>
                </div>
                <p className="font-bold text-sm text-white truncate max-w-[100px] text-center">
                  {thirdPlace.name}
                </p>
                <p className="font-mono text-xs text-yellow-400 font-extrabold mb-2">
                  {thirdPlace.score.toLocaleString()}
                </p>
                <div className="w-full h-20 sm:h-28 rounded-t-2xl bg-gradient-to-t from-slate-900 to-amber-950/30 border-t-2 border-amber-600 flex items-center justify-center text-amber-500 font-black text-2xl shadow-xl">
                  🥉
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Awards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sharpshooter && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Sharpshooter
              </span>
              <p className="font-bold text-sm text-white">{sharpshooter.name}</p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                {sharpshooter.totalCorrect} / {totalQuestions} correct ({Math.round((sharpshooter.totalCorrect / totalQuestions) * 100)}%)
              </p>
            </div>
          </div>
        )}

        {speedDemon && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Speed Demon
              </span>
              <p className="font-bold text-sm text-white">{speedDemon.name}</p>
              <p className="text-xs text-indigo-400 font-semibold mt-0.5">
                Avg {(speedDemon.totalTimeTaken / Math.max(1, speedDemon.totalCorrect)).toFixed(1)}s response
              </p>
            </div>
          </div>
        )}

        {streakMaster && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
            <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Hot Streak
              </span>
              <p className="font-bold text-sm text-white">{streakMaster.name}</p>
              <p className="text-xs text-orange-400 font-semibold mt-0.5">
                {streakMaster.highestStreak} consecutive correct
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full Scoreboard Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Medal className="w-5 h-5 text-indigo-400" />
          <span>Full Scoreboard</span>
        </h3>

        <div className="divide-y divide-slate-800/80">
          {rankedPlayers.map((player, idx) => (
            <div key={player.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-slate-400 w-6 text-center">
                  #{idx + 1}
                </span>
                <span className="text-xl">{player.avatar}</span>
                <span className="font-bold text-sm text-white">{player.name}</span>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right text-xs text-slate-400 hidden sm:block">
                  <span>{player.totalCorrect}/{totalQuestions} correct</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-base text-yellow-400">
                    {player.score.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">pts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        {isHost && (
          <button
            onClick={onRestart}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch (Play Again)</span>
          </button>
        )}

        <button
          onClick={onNewQuiz}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New AI Quiz</span>
        </button>
      </div>
    </div>
  );
};
