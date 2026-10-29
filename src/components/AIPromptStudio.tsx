import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, ExternalLink, ArrowRight, BookOpen, AlertCircle, RefreshCw, Zap, CheckCircle2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Quiz } from '../types/quiz';
import { buildAIPrompt, parseAIQuizOutput, DEMO_QUIZZES, PromptOptions } from '../utils/aiParser';
import { sounds } from '../utils/sound';

interface AIPromptStudioProps {
  onQuizReady: (quiz: Quiz) => void;
  isLoading?: boolean;
}

const POPULAR_TOPICS = [
  'General Knowledge & Trivia',
  'JavaScript & Web Development',
  'Space, Galaxies & Physics',
  'Pop Culture & Cinema',
  'World Geography & Capitals',
  'Brain Busters & Tricky Riddles'
];

export const AIPromptStudio: React.FC<AIPromptStudioProps> = ({ onQuizReady, isLoading }) => {
  const [topic, setTopic] = useState('JavaScript & Web Development');
  const [customTopic, setCustomTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<PromptOptions['difficulty']>('Medium');
  const [style, setStyle] = useState<PromptOptions['style']>('Classic Trivia');

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiOutputText, setAiOutputText] = useState('');
  const [parsedQuiz, setParsedQuiz] = useState<Quiz | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isGeminiGenerating, setIsGeminiGenerating] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  // Active topic
  const activeTopic = customTopic.trim() || topic;

  // Build the prompt whenever options change
  const currentPrompt = buildAIPrompt({
    topic: activeTopic,
    count,
    difficulty,
    style
  });

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopiedPrompt(true);
      sounds.playTick();
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // fallback
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setAiOutputText(text);
        handleParse(text);
      }
    } catch {
      // clipboard access denied, user can paste manually
    }
  };

  const handleParse = (textToParse: string) => {
    setParseError(null);
    if (!textToParse.trim()) {
      setParsedQuiz(null);
      return;
    }

    const result = parseAIQuizOutput(textToParse);
    if (result.success && result.quiz) {
      setParsedQuiz(result.quiz);
      setParseError(null);
      sounds.playJoin();
    } else {
      setParsedQuiz(null);
      setParseError(result.error || 'Failed to parse quiz from input.');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setAiOutputText(val);
    handleParse(val);
  };

  const handleLoadDemo = (demo: Quiz) => {
    setParsedQuiz(demo);
    setAiOutputText(`// Loaded pre-made quiz: ${demo.title}\n` + JSON.stringify(demo, null, 2));
    setParseError(null);
    sounds.playJoin();
  };

  const handleDirectGeminiGenerate = async () => {
    setIsGeminiGenerating(true);
    setParseError(null);
    try {
      const res = await fetch('/api/gemini/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeTopic,
          count,
          difficulty,
          style
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Direct generation failed. Please use Prompt Copy & Paste below.');
      }

      if (data.quiz) {
        setParsedQuiz(data.quiz);
        setAiOutputText(JSON.stringify(data.quiz, null, 2));
        sounds.playCorrect();
      }
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to generate with Gemini.');
    } finally {
      setIsGeminiGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Prompt Builder */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 lg:p-8 backdrop-blur-sm relative overflow-hidden shadow-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Generate & Copy Your AI Prompt
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure your quiz theme, copy the prompt, and paste it into ChatGPT, Claude, Gemini, or DeepSeek
            </p>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="space-y-5">
          {/* Topic selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Choose Quiz Topic
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {POPULAR_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(t);
                    setCustomTopic('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    topic === t && !customTopic
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Or type any custom topic (e.g. Marvel Cinematic Universe, 80s Rock Bands, Quantum Mechanics)..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Parameters row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Question count */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Questions: <span className="text-indigo-400">{count}</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                {[3, 5, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      count === num ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as PromptOptions['difficulty'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-white outline-none focus:border-indigo-500"
              >
                <option value="Easy">Easy (Casual & Fun)</option>
                <option value="Medium">Medium (Balanced)</option>
                <option value="Hard">Hard (Challenging)</option>
                <option value="Savage">Savage (Brain-Buster)</option>
              </select>
            </div>

            {/* Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Style / Tone
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as PromptOptions['style'])}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-white outline-none focus:border-indigo-500"
              >
                <option value="Classic Trivia">Classic Trivia</option>
                <option value="Tricky & Brainy">Tricky & Brainy</option>
                <option value="Fun & Humorous">Fun & Humorous</option>
                <option value="Fast & Casual">Fast & Casual</option>
              </select>
            </div>
          </div>

          {/* Generated Prompt Output Box */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Generated AI Prompt (Ready to Copy)
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  copiedPrompt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-xl bg-slate-950/80 border border-slate-800 p-3 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed scrollbar-thin">
              <pre className="whitespace-pre-wrap">{currentPrompt}</pre>
            </div>

            {/* Quick launch AI links */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Paste into:</span>
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <span>ChatGPT</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <span>Claude</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <a
                  href="https://gemini.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <span>Gemini</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              {/* Server-Side Direct Generation Option */}
              <button
                type="button"
                onClick={handleDirectGeminiGenerate}
                disabled={isGeminiGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isGeminiGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span>⚡ Generate 1-Click with Gemini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Paste AI Response */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 lg:p-8 backdrop-blur-sm relative shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center text-sm border border-pink-500/30">
              2
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Paste Your AI Output
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste what the AI generated (JSON code block or text). We'll parse it into an interactive game!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Paste from Clipboard</span>
          </button>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            rows={5}
            value={aiOutputText}
            onChange={handleTextChange}
            placeholder={`Paste the AI's response here...\n\nExample:\n{\n  "title": "Quantum Trivia",\n  "questions": [...]\n}`}
            className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono text-xs text-slate-200 placeholder-slate-600 outline-none transition-all scrollbar-thin"
          />
        </div>

        {/* Error message */}
        {parseError && (
          <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <p className="font-semibold">Parsing Notice</p>
              <p className="text-rose-300/80 mt-0.5">{parseError}</p>
            </div>
          </div>
        )}

        {/* Quick Demo Quizzes */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Want to test immediately? Load a pre-made quiz:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {DEMO_QUIZZES.map((demo) => (
              <button
                key={demo.id}
                type="button"
                onClick={() => handleLoadDemo(demo)}
                className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/20 transition-all font-medium"
              >
                {demo.title}
              </button>
            ))}
          </div>
        </div>

        {/* Parsed Quiz Live Preview */}
        {parsedQuiz && (
          <div className="mt-6 pt-6 border-t border-slate-800 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">{parsedQuiz.title}</h3>
                  <p className="text-xs text-slate-400">{parsedQuiz.description || 'Ready for multiplayer showdown!'}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {parsedQuiz.questions.length} Questions Ready
              </span>
            </div>

            {/* Questions accordion preview */}
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
              {parsedQuiz.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-semibold text-slate-200 hover:text-white"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{q.question}</span>
                    </span>
                    {expandedQuestion === idx ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                    )}
                  </button>

                  {expandedQuestion === idx && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === q.correctIndex;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold'
                                  : 'bg-slate-900 border border-slate-800/80 text-slate-300'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Launch Room Button */}
            <button
              type="button"
              onClick={() => onQuizReady(parsedQuiz)}
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:via-violet-500 hover:to-pink-500 text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Creating Arena Room...</span>
                </>
              ) : (
                <>
                  <span>Create Arena & Invite Friends</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
