import React from 'react';
import { CheckCircle2, XCircle, Trophy, Flame, Lightbulb, ArrowRight, BarChart2 } from 'lucide-react';
import { RoomState, Player } from '../types/quiz';

interface RevealViewProps {
  roomState: RoomState;
  localPlayer?: Player;
  onShowLeaderboard: () => void;
  onNextQuestion: () => void;
}

export const RevealView: React.FC<RevealViewProps> = ({
  roomState,
  localPlayer,
  onShowLeaderboard,
  onNextQuestion
}) => {
  const isHost = localPlayer?.isHost ?? false;
  const currentIdx = roomState.currentQuestionIndex;
  const currentQ = roomState.quiz.questions[currentIdx];
  const myAnswer = localPlayer?.lastAnswer;
  const isCorrect = myAnswer?.isCorrect ?? false;
  const correctIdx = currentQ.correctIndex;

  // Calculate distribution of all players' answers for this question
  const questionAnswers = roomState.answers[currentIdx] || {};
  const totalAnswers = Object.keys(questionAnswers).length;
  const optionCounts = [0, 0, 0, 0];

  for (const pid in questionAnswers) {
    const ans = questionAnswers[pid];
    if (ans.optionIndex >= 0 && ans.optionIndex < 4) {
      optionCounts[ans.optionIndex] += 1;
    }
  }

  const isLastQuestion = currentIdx + 1 >= roomState.quiz.questions.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Result Status Banner */}
      {localPlayer && (!localPlayer.isHost || roomState.hostPlays) && (
        <div
          className={`p-6 rounded-3xl border shadow-2xl text-center relative overflow-hidden transition-all ${
            isCorrect
              ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900/90 border-emerald-500/40 text-emerald-300'
              : 'bg-gradient-to-b from-rose-950/80 to-slate-900/90 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {isCorrect ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-400" />
            )}
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isCorrect ? 'SPOT ON!' : 'NOT QUITE!'}
            </h2>
          </div>

          {isCorrect && myAnswer ? (
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm mt-3">
              <span className="font-mono font-extrabold text-xl text-yellow-400">
                +{myAnswer.points.toLocaleString()} PTS
              </span>
              <span className="text-emerald-300/80">
                Answered in {myAnswer.timeTaken.toFixed(1)}s
              </span>
              {localPlayer.streak > 1 && (
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {localPlayer.streak}x Streak!
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-300 mt-1">
              The correct answer was: <strong className="text-white">{currentQ.options[correctIdx]}</strong>
            </p>
          )}
        </div>
      )}

      {/* Question Recap & Options Bar Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Question {currentIdx + 1}
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {currentQ.question}
          </h3>
        </div>

        {/* Options Breakdown with Bar Chart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Player Choices Breakdown:
            </span>
            <span>{totalAnswers} total responses</span>
          </div>

          {currentQ.options.map((opt, idx) => {
            const count = optionCounts[idx];
            const percent = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
            const isTarget = idx === correctIdx;
            const myPick = myAnswer?.optionIndex === idx;

            return (
              <div
                key={idx}
                className={`relative rounded-xl border p-3.5 transition-all overflow-hidden ${
                  isTarget
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-white font-bold ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                }`}
              >
                {/* Visual bar fill behind text */}
                <div
                  style={{ width: `${percent}%` }}
                  className={`absolute top-0 left-0 bottom-0 opacity-15 transition-all duration-700 ${
                    isTarget ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isTarget
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm truncate">{opt}</span>
                    {myPick && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold shrink-0">
                        Your Pick
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                    <span className="text-slate-400">{count} {count === 1 ? 'player' : 'players'}</span>
                    <span className="font-mono text-slate-200">({percent}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Explanation / Did You Know? */}
        {currentQ.explanation && (
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Did You Know?
              </p>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Host Controls */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400 text-center sm:text-left">
            {isHost ? 'Host controls: Advance when players are ready.' : 'Waiting for host to proceed...'}
          </span>

          {isHost && (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onShowLeaderboard}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
              >
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Show Leaderboard</span>
              </button>

              <button
                onClick={onNextQuestion}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <span>{isLastQuestion ? 'Final Results 🏆' : 'Next Question'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
