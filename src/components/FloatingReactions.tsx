import React, { useEffect, useState } from 'react';
import { Reaction } from '../types/quiz';

interface FloatingReactionsProps {
  reactions: Reaction[];
}

interface Particle {
  id: string;
  emoji: string;
  name: string;
  x: number; // percentage from left
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  const [activeParticles, setActiveParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (reactions.length > 0) {
      const latest = reactions[0];
      // Random X between 15% and 85%
      const x = Math.floor(Math.random() * 70) + 15;
      const newParticle: Particle = {
        id: latest.id,
        emoji: latest.emoji,
        name: latest.playerName,
        x
      };

      setActiveParticles(prev => [...prev.slice(-10), newParticle]);

      // Remove after animation completes (2.5s)
      const timer = setTimeout(() => {
        setActiveParticles(prev => prev.filter(p => p.id !== latest.id));
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [reactions]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {activeParticles.map((p) => (
        <div
          key={p.id}
          style={{ left: `${p.x}%` }}
          className="absolute bottom-16 flex flex-col items-center animate-float-fade"
        >
          <span className="text-4xl filter drop-shadow-lg">{p.emoji}</span>
          <span className="text-[10px] font-bold text-white/80 bg-black/60 px-2 py-0.5 rounded-full mt-1">
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
};
