import React, { useState, useEffect } from 'react';
import { Sparkles, Users, PlusCircle, LogIn, AlertCircle, Play, Flame } from 'lucide-react';
import { Quiz } from './types/quiz';
import { useQuizSocket } from './hooks/useQuizSocket';
import { Header } from './components/Header';
import { AIPromptStudio } from './components/AIPromptStudio';
import { JoinRoomModal } from './components/JoinRoomModal';
import { LobbyView } from './components/LobbyView';
import { ActiveQuestionView } from './components/ActiveQuestionView';
import { RevealView } from './components/RevealView';
import { LeaderboardView } from './components/LeaderboardView';
import { GameOverView } from './components/GameOverView';
import { FloatingReactions } from './components/FloatingReactions';
import { sounds } from './utils/sound';

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string>('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Read ?room=... from URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInviteCodeFromUrl(roomParam.toUpperCase());
      setActiveTab('join');
    }
  }, []);

  const {
    playerId,
    localPlayer,
    roomState,
    isConnected,
    error: socketError,
    reactions,
    connect,
    disconnect,
    sendAction
  } = useQuizSocket();

  // Create room handler
  const handleQuizReady = async (quiz: Quiz) => {
    setIsCreatingRoom(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz,
          hostId: playerId,
          hostPlays: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      const hostName = sessionStorage.getItem('mindclash_player_name') || 'Host Master';
      const hostAvatar = sessionStorage.getItem('mindclash_player_avatar') || '👑';
      const hostColor = sessionStorage.getItem('mindclash_player_color') || '#6366f1';

      connect(data.code, {
        name: hostName,
        avatar: hostAvatar,
        color: hostColor,
        isHost: true
      });

      // Update URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.set('room', data.code);
      window.history.pushState({}, '', url.toString());
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Could not create room.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join room handler
  const handleJoinRoom = ({ roomCode, name, avatar, color }: { roomCode: string; name: string; avatar: string; color: string }) => {
    setJoinError(null);
    connect(roomCode, {
      name,
      avatar,
      color,
      isHost: false
    });

    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    window.history.pushState({}, '', url.toString());
  };

  const handleLeaveRoom = () => {
    disconnect();
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
  };

  // Host Actions
  const handleStartGame = () => {
    if (!roomState) return;
    sendAction({
      type: 'START_GAME',
      roomCode: roomState.code,
      hostId: playerId
    });
  };

  const handleToggleReady = () => {
    if (!roomState) return;
    sendAction({
      type: 'TOGGLE_READY',
      roomCode: roomState.code,
      playerId
    });
    sounds.playTick();
  };

  const handleUpdateSettings = (settings: { timePerQuestion?: number; hostPlays?: boolean }) => {
    if (!roomState) return;
    sendAction({
      type: 'UPDATE_SETTINGS',
      roomCode: roomState.code,
      ...settings
    });
  };

  const handleSubmitAnswer = (optionIndex: number) => {
    if (!roomState) return;
    sendAction({
      type: 'SUBMIT_ANSWER',
      roomCode: roomState.code,
      playerId,
      questionIndex: roomState.currentQuestionIndex,
      optionIndex
    });
  };

  const handleShowLeaderboard = () => {
    if (!roomState) return;
    sendAction({
      type: 'SHOW_LEADERBOARD',
      roomCode: roomState.code,
      hostId: playerId
    });
  };

  const handleNextQuestion = () => {
    if (!roomState) return;
    sendAction({
      type: 'NEXT_QUESTION',
      roomCode: roomState.code,
      hostId: playerId
    });
  };

  const handleRestart = () => {
    if (!roomState) return;
    sendAction({
      type: 'RESTART_GAME',
      roomCode: roomState.code,
      hostId: playerId
    });
  };

  const handleSendReaction = (emoji: string) => {
    if (!roomState) return;
    sendAction({
      type: 'SEND_REACTION',
      roomCode: roomState.code,
      playerId,
      emoji
    });
  };

  const currentCount = roomState ? Object.keys(roomState.players).length : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        roomCode={roomState?.code}
        playerCount={currentCount}
        onLeaveRoom={roomState ? handleLeaveRoom : undefined}
      />

      {/* Floating Reactions live overlay */}
      <FloatingReactions reactions={reactions} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Global Errors */}
        {(socketError || joinError) && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <p className="font-medium">{socketError || joinError}</p>
          </div>
        )}

        {/* VIEW 1: NOT IN ROOM (Home: AI Prompt Studio or Join Room) */}
        {!roomState ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Multiplayer Real-Time Quiz Showdown</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Turn ANY AI Output Into a <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-pink-400 to-amber-300">Live Quiz Game</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Generate prompt with 1 click &bull; Paste into ChatGPT, Claude, Gemini or DeepSeek &bull; Paste the output back to create an instant multiplayer arena with real-time scoring!
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center">
              <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex gap-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    activeTab === 'create'
                      ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create with AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    activeTab === 'join'
                      ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Join Room {inviteCodeFromUrl ? `(${inviteCodeFromUrl})` : ''}</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'create' ? (
              <AIPromptStudio onQuizReady={handleQuizReady} isLoading={isCreatingRoom} />
            ) : (
              <JoinRoomModal
                initialRoomCode={inviteCodeFromUrl}
                onJoin={handleJoinRoom}
                isLoading={isConnected && !roomState}
              />
            )}
          </div>
        ) : (
          /* VIEW 2: INSIDE ROOM (State Machine) */
          <div className="animate-in fade-in duration-300">
            {/* LOBBY */}
            {roomState.status === 'lobby' && (
              <LobbyView
                roomState={roomState}
                localPlayer={localPlayer}
                onStartGame={handleStartGame}
                onToggleReady={handleToggleReady}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {/* COUNTDOWN */}
            {roomState.status === 'countdown' && (
              <div className="max-w-md mx-auto text-center py-20 space-y-6">
                <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-pink-600 flex items-center justify-center text-7xl font-black text-white shadow-2xl shadow-indigo-500/50 animate-bounce ring-4 ring-white/20">
                  {roomState.countdownRemaining || 3}
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold text-white">Get Ready!</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Question {roomState.currentQuestionIndex + 1} starting in seconds...
                  </p>
                </div>
              </div>
            )}

            {/* ACTIVE QUESTION */}
            {roomState.status === 'question' && (
              <ActiveQuestionView
                roomState={roomState}
                localPlayer={localPlayer}
                onSubmitAnswer={handleSubmitAnswer}
                onSendReaction={handleSendReaction}
              />
            )}

            {/* REVEAL */}
            {roomState.status === 'reveal' && (
              <RevealView
                roomState={roomState}
                localPlayer={localPlayer}
                onShowLeaderboard={handleShowLeaderboard}
                onNextQuestion={handleNextQuestion}
              />
            )}

            {/* LEADERBOARD */}
            {roomState.status === 'leaderboard' && (
              <LeaderboardView
                roomState={roomState}
                localPlayer={localPlayer}
                onNextQuestion={handleNextQuestion}
              />
            )}

            {/* GAMEOVER */}
            {roomState.status === 'gameover' && (
              <GameOverView
                roomState={roomState}
                localPlayer={localPlayer}
                onRestart={handleRestart}
                onNewQuiz={handleLeaveRoom}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-4 px-6 text-center text-xs text-slate-500">
        MindClash Real-Time AI Arena &bull; Fast, gamified multiplayer quiz engine with instant AI prompt generation.
      </footer>
    </div>
  );
}
