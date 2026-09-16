import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { RunnerEngine } from '../game/RunnerEngine';
import { MAPS } from '../game/maps';

export default function BossRun() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RunnerEngine | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'GAME_OVER' | 'VICTORY'>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({ score: 0, coins: 0, hints: 0, buffs: {} as any });
  const [finalScore, setFinalScore] = useState(0);

  // Boss specific state
  const [bossPhase, setBossPhase] = useState(1);
  const [bossHealth, setBossHealth] = useState(100);
  const [voidUnlocked, setVoidUnlocked] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // We reuse the RunnerEngine but we will just simulate a harder map and boss state visually.
    const engine = new RunnerEngine(canvasRef.current, 'volcano');
    engine.onStateUpdate = (newStats: any) => {
      setStats(newStats);
      // Simulate boss damage based on score for visual feedback
      setBossHealth(Math.max(0, 100 - (newStats.score / 50)));
      
      if (newStats.score >= 5000 && bossPhase === 1) setBossPhase(2);
      if (newStats.score >= 10000 && bossPhase === 2) setBossPhase(3);
    };

    engine.onGameOver = (score, hints, coins) => {
      handleGameOver(score, hints, coins);
    };
    engineRef.current = engine;

    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  const startGame = async () => {
    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId: 'volcano', sessionType: 'BOSS' })
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setGameState('PLAYING');
        setBossPhase(1);
        setBossHealth(100);
        
        if (canvasRef.current) {
          if (engineRef.current) engineRef.current.stop();
          const engine = new RunnerEngine(canvasRef.current, 'volcano');
          engine.onStateUpdate = (newStats: any) => {
            setStats(newStats);
            setBossHealth(Math.max(0, 100 - (newStats.score / 50)));
            if (newStats.score >= 1000 && bossPhase === 1) setBossPhase(2);
            if (newStats.score >= 3000 && bossPhase === 2) setBossPhase(3);
            if (newStats.score >= 5000) {
              handleVictory(newStats.score, newStats.hints, newStats.coins);
            }
          };
          engine.onGameOver = (score, hints, coins) => {
            handleGameOver(score, hints, coins);
          };
          engineRef.current = engine;
          engine.start();
        }
      }
    } catch (err) {
      console.error("Failed to start session", err);
    }
  };

  const handleGameOver = async (score: number, collectedHints: number, collectedCoins: number) => {
    setGameState('GAME_OVER');
    setFinalScore(score);
    
    if (sessionId) {
      try {
        await fetch('/api/sessions/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            status: 'COMPLETED',
            claimedScore: score,
            claimedHints: collectedHints,
            claimedCoins: collectedCoins,
            bossPhase: bossPhase
          })
        });
      } catch (err) {
        console.error("Failed to sync end session", err);
      }
    }
  };

  const handleVictory = async (score: number, collectedHints: number, collectedCoins: number) => {
    if (engineRef.current) engineRef.current.stop();
    setGameState('VICTORY');
    setFinalScore(score);
    
    if (sessionId) {
      try {
        await fetch('/api/sessions/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            status: 'COMPLETED',
            claimedScore: score,
            claimedHints: collectedHints,
            claimedCoins: collectedCoins,
            bossPhase: 4 // Defeated
          })
        });

        // Trigger unlock Void Spirit API call
        const unlockRes = await fetch('/api/spirits/unlock-void', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const unlockData = await unlockRes.json();
        if (unlockData.success) {
          setVoidUnlocked(true);
        }
      } catch (err) {
        console.error("Failed to sync end session or unlock void spirit", err);
      }
    }
  };

  const handleAbandon = async () => {
    if (engineRef.current) engineRef.current.stop();
    
    if (sessionId) {
      try {
        await fetch('/api/sessions/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            status: 'ABANDONED',
            claimedScore: stats.score,
            claimedHints: stats.hints,
            claimedCoins: stats.coins,
            bossPhase: bossPhase
          })
        });
      } catch (err) {
        console.error("Failed to sync abandon", err);
      }
    }
    
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-game-bg flex flex-col relative overflow-hidden">
      {/* Header / Stats */}
      <header className="p-4 flex justify-between items-center z-10 border-b border-gray-800 bg-black/50">
        <div className="flex gap-6">
          <div className="text-xl font-bold text-game-primary uppercase tracking-widest">
            Score: <span className="text-white">{Math.floor(stats.score)}</span>
          </div>
          <div className="text-xl font-bold text-yellow-400 uppercase tracking-widest">
            Coins: <span className="text-white">{stats.coins}</span>
          </div>
          <div className="text-xl font-bold text-game-secondary uppercase tracking-widest">
            Fragments: <span className="text-white">{stats.hints}</span>/3
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={handleAbandon}>Abandon</Button>
        </div>
      </header>

      {/* Boss HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-10 text-center">
          <h2 className="text-3xl font-bold text-red-500 uppercase tracking-widest mb-2 shadow-red-900 drop-shadow-lg">
            Abyssal Behemoth - Phase {bossPhase}
          </h2>
          <div className="w-full bg-red-950 h-4 rounded-full border border-red-900 overflow-hidden">
            <div 
              className="bg-red-500 h-full transition-all duration-100 ease-linear"
              style={{ width: `${bossHealth}%` }}
            />
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <div className="flex-1 relative w-full h-full">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Overlays */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-5xl font-bold text-red-500 uppercase tracking-widest mb-6">Boss Challenge</h1>
            <p className="text-gray-300 max-w-lg mb-8">Survive the run, dodge intensified obstacles, and reach the 5000 score mark to defeat the boss. High risk, high XP reward.</p>
            <div className="flex gap-4">
              <Button onClick={startGame} className="bg-red-600 hover:bg-red-700 text-white">Enter Boss Run</Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>Return to Hub</Button>
            </div>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-4xl font-bold text-red-500 uppercase tracking-widest mb-4">Defeated</h2>
            
            {/* Run Result Screen Section */}
            <div className="bg-gray-900/80 border border-gray-700 rounded-lg p-6 w-full max-w-lg mb-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest border-b border-gray-700 pb-2 mb-4">Run Results</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="text-gray-400">Score</div>
                <div className="text-game-primary font-bold text-right">{Math.floor(finalScore)}</div>
                
                <div className="text-gray-400">Phase Reached</div>
                <div className="text-red-400 font-bold text-right">{bossPhase}</div>
                
                <div className="text-gray-400">XP Gained</div>
                <div className="text-purple-400 font-bold text-right">+{Math.floor(finalScore / 10) + (stats.hints * 10) + (bossPhase * 50)}</div>

                <div className="text-gray-400">Coins Earned</div>
                <div className="text-yellow-400 font-bold text-right">+{stats.coins}</div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={startGame} className="bg-red-600 hover:bg-red-700">Try Again</Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard')}>Return to Hub</Button>
            </div>
          </div>
        )}

        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-5xl font-bold text-yellow-400 uppercase tracking-widest mb-4">Boss Defeated!</h2>
            <p className="text-lg text-gray-300 mb-8">You survived the gauntlet and earned massive XP.</p>
            
            {/* Run Result Screen Section */}
            {voidUnlocked && (
              <div className="bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border-2 border-purple-400 rounded-2xl p-5 w-full max-w-lg mb-6 flex items-center gap-4 text-left shadow-2xl shadow-purple-900/60 animate-bounce">
                <div className="w-16 h-16 rounded-2xl bg-purple-800/50 border border-purple-300 flex items-center justify-center text-4xl shadow-lg">
                  🌌
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-purple-300 font-black">Thần Tích Xuất Hiện!</div>
                  <div className="text-xl font-black text-amber-300 font-serif">Mở Khóa: Linh Thú Hư Không</div>
                  <div className="text-xs text-purple-200 mt-1">Linh thú thứ 7 huyền thoại đã chính thức gia nhập bộ sưu tập của bạn!</div>
                </div>
              </div>
            )}

            <div className="bg-gray-900/80 border border-yellow-900 rounded-lg p-6 w-full max-w-lg mb-6">
              <h3 className="text-xl font-bold text-yellow-500 uppercase tracking-widest border-b border-yellow-900 pb-2 mb-4">Final Results</h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="text-gray-400">Score</div>
                <div className="text-game-primary font-bold text-right">{Math.floor(finalScore)}</div>
                
                <div className="text-gray-400">XP Gained</div>
                <div className="text-purple-400 font-bold text-right">+{Math.floor(finalScore / 10) + (stats.hints * 10) + 200}</div>

                <div className="text-gray-400">Coins Earned</div>
                <div className="text-yellow-400 font-bold text-right">+{stats.coins}</div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button variant="primary" onClick={() => navigate('/dashboard')}>Return to Hub</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
