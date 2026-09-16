import React from 'react';
import { Zap, CheckCircle } from 'lucide-react';

interface GuessRushGameProps {
  rushHints: string[];
}

export const GuessRushGame: React.FC<GuessRushGameProps> = ({ rushHints }) => {
  return (
    <div id="guess-rush-game-container" className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-4">
        <Zap className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Đoán Cực Tốc — Ai Nhanh Nhất?</h3>
      <p className="text-sm text-slate-400 max-w-md text-center mb-6">
        Các gợi ý sẽ tự động hé lộ dần sau mỗi 10 giây. Hãy nhập câu trả lời vào khung chat bên phải nhanh nhất có thể!
      </p>

      <div className="w-full max-w-md space-y-2.5">
        {rushHints.map((hint, idx) => (
          <div 
            key={idx} 
            className="bg-slate-800/80 border border-slate-700/80 p-3 rounded-xl text-sm font-medium text-slate-200 flex items-center gap-2.5 animate-fadeIn"
          >
            <CheckCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span>{hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
