import React from 'react';
import { Trophy, Flame, ArrowRight, Crown, Medal } from 'lucide-react';
import { RoomState, Player } from '../types/quiz';

interface LeaderboardViewProps {
  roomState: RoomState;
  localPlayer?: Player;
  onNextQuestion: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  roomState,
  localPlayer,
  onNextQuestion
}) => {
  const isHost = localPlayer?.isHost ?? false;
  const currentIdx = roomState.currentQuestionIndex;
  const isLastQuestion = currentIdx + 1 >= roomState.quiz.questions.length;

  // Sort players descending by score
  const rankedPlayers = Object.values(roomState.players).sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5" />
          <span>Round {currentIdx + 1} Standings</span>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">Arena Leaderboard</h2>
      </div>

      {/* Ranked List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-3">
        {rankedPlayers.map((player, rankIdx) => {
          const isMe = player.id === localPlayer?.id;
          const isTop3 = rankIdx < 3;

          let rankBadge = (
            <span className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-black text-sm flex items-center justify-center">
              #{rankIdx + 1}
            </span>
          );

          if (rankIdx === 0) {
            rankBadge = (
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-yellow-500/30">
                🥇
              </span>
            );
          } else if (rankIdx === 1) {
            rankBadge = (
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                🥈
              </span>
            );
          } else if (rankIdx === 2) {
            rankBadge = (
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                🥉
              </span>
            );
          }

          return (
            <div
              key={player.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                isMe
                  ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {rankBadge}

                <div
                  style={{ backgroundColor: player.color + '22', borderColor: player.color }}
                  className="w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0"
                >
                  {player.avatar}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base truncate">
                      {player.name}
                    </span>
                    {player.isHost && (
                      <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    )}
                    {isMe && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  {player.streak > 1 && (
                    <div className="flex items-center gap-1 text-[11px] text-orange-400 font-bold mt-0.5">
                      <Flame className="w-3 h-3" />
                      <span>{player.streak} In A Row!</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-black text-lg text-yellow-400 block">
                  {player.score.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">PTS</span>
              </div>
            </div>
          );
        })}

        {/* Host action footer */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isHost ? 'Host controls the match tempo.' : 'Waiting for host to proceed...'}
          </span>

          {isHost && (
            <button
              onClick={onNextQuestion}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <span>{isLastQuestion ? 'Final Showdown Results 🏆' : 'Next Question ➡️'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
