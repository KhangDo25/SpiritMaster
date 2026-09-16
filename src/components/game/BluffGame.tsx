import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '../ui/Button';

interface BluffGameProps {
  bluffQuestion: string;
  bluffStage: 'SUBMITTING' | 'VOTING' | 'REVEAL';
  bluffOptions: Array<{ id: string; text: string }>;
  onSubmitBluff?: (answer: string) => void;
  onVoteBluff?: (optionId: string) => void;
}

export const BluffGame: React.FC<BluffGameProps> = ({
  bluffQuestion,
  bluffStage,
  bluffOptions,
  onSubmitBluff,
  onVoteBluff
}) => {
  const [bluffInput, setBluffInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bluffInput.trim() || hasSubmitted) return;
    onSubmitBluff?.(bluffInput.trim());
    setHasSubmitted(true);
  };

  return (
    <div id="bluff-game-container" className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center shadow-xl">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
        <Smile className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2 text-center max-w-lg">{bluffQuestion}</h2>

      {/* Stage 1: Submitting fake answers */}
      {bluffStage === 'SUBMITTING' && (
        <div className="w-full max-w-md mt-4">
          <p className="text-xs text-purple-300 text-center mb-3">
            Hãy tạo một câu trả lời giả mạo nghe thật thuyết phục để lừa người khác!
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              id="bluff-fake-input"
              type="text"
              placeholder="Nhập câu trả lời giả..."
              value={bluffInput}
              onChange={e => setBluffInput(e.target.value)}
              disabled={hasSubmitted}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <Button
              id="bluff-submit-btn"
              type="submit"
              disabled={hasSubmitted || !bluffInput.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
            >
              {hasSubmitted ? 'Đã gửi' : 'Gửi đáp án'}
            </Button>
          </form>
        </div>
      )}

      {/* Stage 2: Voting for what you believe is the true answer */}
      {bluffStage === 'VOTING' && (
        <div className="w-full max-w-md mt-4">
          <p className="text-xs text-slate-400 text-center mb-4">
            Đâu là sự thật? Hãy chọn đáp án chính xác (chọn trúng câu giả sẽ tặng điểm cho kẻ lừa bạn!)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {bluffOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                disabled={hasVoted}
                onClick={() => {
                  onVoteBluff?.(opt.id);
                  setHasVoted(true);
                }}
                className="p-3 bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500 rounded-xl text-sm font-semibold text-slate-200 transition text-left"
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
