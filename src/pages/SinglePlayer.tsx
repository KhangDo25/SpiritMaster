import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArenaEngine } from '../game/ArenaEngine';
import { SPIRITS, SPIRIT_LIST } from '../game/spirits';
import { ARENA_THEMES, ARENA_THEME_LIST } from '../game/maps';
import { ArenaStats, ArenaThemeId, InRunEvent, SpiritId, UpgradeDef, UpgradeItem } from '../game/types';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { getAuthToken, clearAuthToken } from '../utils/auth';
import { soundEngine } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Droplets, 
  Leaf, 
  Zap, 
  Moon, 
  Sun, 
  Heart, 
  Shield, 
  Coins, 
  ArrowLeft, 
  Sparkles, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Skull,
  Search,
  Swords,
  Timer,
  FastForward,
  Pause
} from 'lucide-react';
import { VirtualJoystick } from '../components/game/VirtualJoystick';

export default function SinglePlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ArenaEngine | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Selection
  const [selectedSpiritId, setSelectedSpiritId] = useState<SpiritId>('phoenix');
  const [selectedThemeId, setSelectedThemeId] = useState<ArenaThemeId>('forest');

  // Game Flow State: 'SELECT' | 'PLAYING' | 'RESULT'
  const [gameState, setGameState] = useState<'SELECT' | 'PLAYING' | 'RESULT'>('SELECT');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());

  // Mobile & Responsiveness State
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(true);
  const [isGamePaused, setIsGamePaused] = useState(false);

  // Real-time Arena Stats
  const [stats, setStats] = useState<ArenaStats>({
    hp: 110,
    maxHp: 110,
    shield: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 40,
    score: 0,
    coins: 0,
    cluesFound: 0,
    currentWave: 1,
    totalWaves: 5,
    waveTimerSeconds: 32,
    enemiesKilled: 0,
    dashCooldownRemaining: 0,
    skillCooldownRemaining: 0,
    isBossAlive: false,
    bossHpPercent: 100,
    isDead: false,
    isVictory: false,
    equippedUpgrades: []
  });

  // Modals & Events
  const [levelUpChoices, setLevelUpChoices] = useState<UpgradeDef[] | null>(null);
  const [activeEvent, setActiveEvent] = useState<InRunEvent | null>(null);

  // Result & Mystery
  const [finalResult, setFinalResult] = useState<{
    score: number;
    coins: number;
    clues: number;
    victory: boolean;
    enemiesKilled: number;
    level: number;
    upgrades: UpgradeItem[];
    xpEarned: number;
  } | null>(null);

  const [hints, setHints] = useState<string[]>([]);
  const [guessInput, setGuessInput] = useState('');
  const [guessResult, setGuessResult] = useState<{ isCorrect: boolean; canonicalName?: string } | null>(null);
  const [guessError, setGuessError] = useState('');
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);

  // Pre-select theme if provided via URL
  useEffect(() => {
    const realmParam = searchParams.get('realm');
    if (realmParam) {
      const lower = realmParam.toLowerCase();
      if (lower.includes('hỏa') || lower.includes('fire')) setSelectedThemeId('fire');
      else if (lower.includes('thủy') || lower.includes('frost') || lower.includes('băng')) setSelectedThemeId('frost');
      else if (lower.includes('mộc') || lower.includes('forest') || lower.includes('rừng')) setSelectedThemeId('forest');
      else if (lower.includes('ảnh') || lower.includes('shadow') || lower.includes('u minh')) setSelectedThemeId('shadow');
      else if (lower.includes('quang') || lower.includes('celestial') || lower.includes('thánh')) setSelectedThemeId('celestial');
    }
  }, [searchParams]);

  // Keyboard controls for WASD / Arrows / Dash / Skill
  useEffect(() => {
    const keysDown = new Set<string>();

    const updateMovement = () => {
      if (!engineRef.current || gameState !== 'PLAYING') return;
      let dx = 0;
      let dy = 0;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) dy -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) dy += 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) dx -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) dx += 1;
      engineRef.current.move(dx, dy);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || !engineRef.current) return;

      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        keysDown.add(e.code);
        updateMovement();
      } else if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        engineRef.current.dash();
      } else if (e.code === 'KeyE' || e.code === 'KeyQ') {
        e.preventDefault();
        engineRef.current.triggerSkill();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keysDown.delete(e.code);
        updateMovement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Mobile device detection and orientation tracking
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmall = window.innerWidth < 1024;
      setIsMobileDevice(isTouch || isSmall);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // ResizeObserver for canvas container to resize ArenaEngine smoothly
  useEffect(() => {
    if (!containerRef.current || gameState !== 'PLAYING') return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && engineRef.current) {
          engineRef.current.resize(width, height);
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [gameState]);

  // Handle visibility change and blur (tab switch, phone lock, app change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameState === 'PLAYING') {
        if (engineRef.current && !engineRef.current.getIsPaused()) {
          engineRef.current.pause();
          setIsGamePaused(true);
        }
      }
    };

    const handleBlur = () => {
      if (gameState === 'PLAYING') {
        if (engineRef.current && !engineRef.current.getIsPaused()) {
          engineRef.current.pause();
          setIsGamePaused(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState]);

  // Stop engine on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const pauseGame = () => {
    if (gameState !== 'PLAYING' || !engineRef.current) return;
    soundEngine.playClick();
    engineRef.current.pause();
    setIsGamePaused(true);
  };

  const resumeGame = () => {
    if (!engineRef.current) return;
    soundEngine.playClick();
    engineRef.current.resume();
    setIsGamePaused(false);
  };

  // Start Arena
  const startArena = async () => {
    soundEngine.playClick();
    setGameState('PLAYING');
    setIsGamePaused(false);
    setLevelUpChoices(null);
    setActiveEvent(null);
    setFinalResult(null);
    setGuessResult(null);
    setGuessError('');
    setGuessInput('');
    setHints([]);

    let createdSessionId = `local_${Date.now()}`;

    // Backend Session Start
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mapId: selectedThemeId,
          sessionType: 'NORMAL'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.sessionId) {
          createdSessionId = data.data.sessionId;
        }
      } else if (res.status === 401) {
        clearAuthToken();
      }
    } catch (err) {
      console.warn('Offline session fallback:', err);
    }

    setSessionId(createdSessionId);

    // Initialize Engine
    setTimeout(() => {
      if (!canvasRef.current) return;
      if (engineRef.current) engineRef.current.stop();

      const engine = new ArenaEngine(canvasRef.current, selectedThemeId, selectedSpiritId);
      if (containerRef.current) {
        engine.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
      engine.onStateUpdate = setStats;
      engine.onLevelUp = (choices) => {
        setLevelUpChoices(choices);
      };
      engine.onEventTrigger = (event) => {
        setActiveEvent(event);
      };
      engine.onGameOver = handleGameOver;

      engineRef.current = engine;
      engine.start();
    }, 60);
  };

  const handleGameOver = async (
    score: number,
    clues: number,
    coins: number,
    victory: boolean,
    enemiesKilled: number,
    level: number,
    upgrades: UpgradeItem[]
  ) => {
    const xp = Math.floor(score / 8) + enemiesKilled * 4 + (victory ? 250 : 50);

    setFinalResult({
      score,
      coins,
      clues,
      victory,
      enemiesKilled,
      level,
      upgrades,
      xpEarned: xp
    });

    setGameState('RESULT');

    // Sync session end with backend
    if (sessionId && !sessionId.startsWith('local_')) {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch('/api/sessions/end', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId,
            status: 'COMPLETED',
            claimedScore: score,
            claimedHints: clues,
            claimedCoins: coins
          })
        });

        // Fetch mystery hints
        const hintsRes = await fetch(`/api/mystery/${sessionId}/hints`, { headers });
        if (hintsRes.ok) {
          const hintsData = await hintsRes.json();
          if (hintsData.success && hintsData.data?.hints) {
            setHints(hintsData.data.hints);
          }
        }
      } catch (err) {
        console.error('Session sync error:', err);
      }
    } else {
      setHints([
        'Linh thú nắm giữ sức mạnh nguyên tố thiên địa.',
        'Thường ngự trị tại các thánh địa cổ xưa.',
        'Biểu tượng của sức mạnh thức tỉnh bất diệt.'
      ]);
    }
  };

  const handleAbandon = async () => {
    soundEngine.playClick();
    if (engineRef.current) engineRef.current.stop();
    setGameState('SELECT');
  };

  const chooseUpgrade = (upgrade: UpgradeDef) => {
    if (!engineRef.current) return;
    setLevelUpChoices(null);
    engineRef.current.applyUpgrade(upgrade);
  };

  const submitGuess = async () => {
    if (!guessInput.trim()) return;
    setIsSubmittingGuess(true);
    setGuessError('');

    if (sessionId && !sessionId.startsWith('local_')) {
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/mystery/${sessionId}/guess`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ guessText: guessInput.trim() })
        });
        const data = await res.json();
        if (data.success) {
          setGuessResult(data.data);
          if (data.data.isCorrect) soundEngine.playCorrect();
          else soundEngine.playWrong();
        } else {
          setGuessError(data.message || 'Không thể kiểm tra ẩn số.');
        }
      } catch (err) {
        setGuessError('Lỗi kết nối máy chủ.');
      } finally {
        setIsSubmittingGuess(false);
      }
    } else {
      const isRight = guessInput.trim().length > 2;
      setGuessResult({
        isCorrect: isRight,
        canonicalName: isRight ? guessInput.trim() : 'Hỏa Phượng Hoàng'
      });
      if (isRight) soundEngine.playCorrect();
      else soundEngine.playWrong();
      setIsSubmittingGuess(false);
    }
  };

  const selectedSpirit = SPIRITS[selectedSpiritId];
  const selectedTheme = ARENA_THEMES[selectedThemeId];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Về Sảnh</span>
          </Button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-black tracking-wider uppercase text-base sm:text-lg flex items-center gap-1.5">
              <Swords className="w-5 h-5 text-amber-400" />
              Spirit Arena
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold uppercase tracking-wider">
              Mini Roguelite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 font-bold text-xs sm:text-sm">
            <Coins className="w-4 h-4" />
            <span>{user?.profile?.coins ?? 0}</span>
          </div>
        </div>
      </header>

      {/* --- SCREEN 1: SELECT SPIRIT & ARENA THEME --- */}
      {gameState === 'SELECT' && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
          
          {/* Hero Banner */}
          <div className="relative rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 border border-amber-500/20 p-6 overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                  Đấu Trường Linh Thú (Spirit Arena)
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                  Chiến đấu sinh tồn trong võ đài quái vật. Tiêu diệt kẻ địch, thu thập Tinh Thạch Linh Lực để Lên Cấp, chọn 1 trong 3 Nâng Cấp để xây dựng sức mạnh độc nhất và hạ gục Cổ Thần Hư Không!
                </p>
              </div>

              <Button 
                onClick={startArena}
                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black tracking-wider uppercase px-8 py-3.5 text-sm sm:text-base shadow-lg shadow-amber-500/20 flex items-center gap-2 self-start md:self-auto"
              >
                <Play className="w-5 h-5 fill-current" />
                Vào Đấu Trường Ngay
              </Button>
            </div>
          </div>

          {/* 1. Chọn Linh Thú */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              1. Chọn Linh Thú ({SPIRIT_LIST.length} Thần Thú)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SPIRIT_LIST.map((spirit) => {
                const isSelected = selectedSpiritId === spirit.id;
                return (
                  <div
                    key={spirit.id}
                    onClick={() => {
                      setSelectedSpiritId(spirit.id);
                      soundEngine.playClick();
                    }}
                    className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border relative ${
                      isSelected 
                        ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/15 ring-1 ring-amber-400/40' 
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md"
                          style={{ backgroundColor: spirit.color }}
                        >
                          {spirit.realm === 'Hỏa' && <Flame className="w-5 h-5" />}
                          {spirit.realm === 'Thủy' && <Droplets className="w-5 h-5" />}
                          {spirit.realm === 'Mộc' && <Leaf className="w-5 h-5" />}
                          {spirit.realm === 'Lôi' && <Zap className="w-5 h-5" />}
                          {spirit.realm === 'Ảnh' && <Moon className="w-5 h-5" />}
                          {spirit.realm === 'Quang' && <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-100 text-sm">{spirit.name}</h3>
                          <p className="text-xs text-slate-400">{spirit.title}</p>
                        </div>
                      </div>

                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                        style={{ color: spirit.color, backgroundColor: `${spirit.color}15` }}
                      >
                        {spirit.realm}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80 mb-2.5">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {spirit.skillName}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {spirit.skillDescription}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <div>
                        <div className="font-bold text-slate-200">{spirit.baseStats.maxHp}</div>
                        <div>Máu (HP)</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{spirit.baseStats.attackDamage}</div>
                        <div>Sát Thương</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{spirit.baseStats.attackSpeed}/s</div>
                        <div>Tốc Đánh</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Chọn Võ Đài */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              2. Chọn Sàn Đấu ({ARENA_THEME_LIST.length} Võ Đài)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {ARENA_THEME_LIST.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => {
                      setSelectedThemeId(theme.id);
                      soundEngine.playClick();
                    }}
                    className={`cursor-pointer rounded-xl p-3.5 transition-all border relative ${
                      isSelected
                        ? 'border-rose-400 bg-slate-900 shadow-md shadow-rose-500/15'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70'
                    }`}
                  >
                    <div 
                      className="h-1.5 w-full rounded-full mb-2"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                    <h4 className="font-bold text-xs text-slate-100">{theme.vietnameseName}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{theme.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ready & Controls Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400">
            <div>
              <span className="font-bold text-slate-200">Điều Khiển: </span>
              <span><strong>WASD / Phím Mũi Tên</strong> để Di Chuyển. Tự động ngắm & bắn quái gần nhất. Phím <strong>Space / Shift</strong> để Lướt né đòn. Phím <strong>E / Q</strong> để dùng Chiêu Thức!</span>
            </div>

            <Button 
              onClick={startArena}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2 shrink-0"
            >
              Tham Chiến
            </Button>
          </div>
        </main>
      )}

      {/* --- SCREEN 2: ACTIVE COMBAT ARENA --- */}
      {gameState === 'PLAYING' && (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-1 sm:p-4 relative select-none game-viewport">
          
          {/* Portrait Orientation Hint Banner */}
          {isPortrait && showRotateHint && (
            <div className="w-full max-w-5xl bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs px-3 py-1.5 rounded-xl mb-1.5 flex items-center justify-between shadow-lg">
              <span className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Mẹo: Xoay ngang điện thoại (Landscape) để có góc nhìn đấu trường rộng nhất!</span>
              </span>
              <button 
                onClick={() => setShowRotateHint(false)} 
                className="text-amber-400 hover:text-white px-2 py-0.5 font-bold"
                aria-label="Đóng gợi ý"
              >
                ✕
              </button>
            </div>
          )}

          {/* Arena Top HUD */}
          <div className="w-full max-w-5xl flex flex-col gap-1.5 mb-1.5">
            <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-800 text-xs shadow-lg">
              
              {/* HP Bar & Shield & Level */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                  <div className="w-24 sm:w-36 bg-slate-800 rounded-full h-3 relative overflow-hidden border border-slate-700">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150 rounded-full"
                      style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-200 text-[11px] hidden sm:inline">
                    {stats.hp}/{stats.maxHp}
                  </span>
                </div>

                {stats.shield > 0 && (
                  <span className="flex items-center text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/30 text-[10px] sm:text-[11px]">
                    <Shield className="w-3 h-3 mr-0.5 fill-current" />
                    +{stats.shield}
                  </span>
                )}

                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                  Lv.{stats.level}
                </span>
              </div>

              {/* Wave & Boss Timer */}
              <div className="flex items-center gap-2">
                {stats.isBossAlive ? (
                  <span className="text-purple-400 font-black tracking-wider uppercase animate-pulse flex items-center gap-1 text-[11px] sm:text-xs">
                    <Skull className="w-4 h-4" />
                    BOSS CỔ THẦN
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold tracking-wide uppercase text-[10px] sm:text-xs flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    ĐỢT {stats.currentWave}/{stats.totalWaves} ({stats.waveTimerSeconds}s)
                  </span>
                )}
              </div>

              {/* Score & Coins & Mystery Clues & Pause / Mute */}
              <div className="flex items-center gap-2 sm:gap-3 font-bold text-slate-300">
                <div className="flex items-center gap-1 text-amber-400 text-[11px] sm:text-xs">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{stats.coins}</span>
                </div>
                <div className="flex items-center gap-1 text-purple-400 text-[11px] sm:text-xs" title="Mảnh Ẩn Số">
                  <Search className="w-3.5 h-3.5" />
                  <span>{stats.cluesFound}/3</span>
                </div>

                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 transition-colors"
                  title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                {/* Pause Button */}
                <button
                  type="button"
                  onClick={pauseGame}
                  className="p-1 rounded-lg text-slate-300 hover:text-amber-400 bg-slate-800/80 border border-slate-700/60 transition-colors"
                  title="Tạm dừng"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAbandon}
                  className="text-slate-400 hover:text-rose-400 text-[11px] px-2 py-1 h-auto hidden sm:flex"
                >
                  Rời Trận
                </Button>
              </div>
            </div>

            {/* Boss HP Bar (When Boss is active) */}
            {stats.isBossAlive && (
              <div className="w-full bg-slate-900/95 border border-purple-500/40 rounded-lg p-2 shadow-lg flex items-center gap-2 text-xs">
                <Skull className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="font-bold text-purple-300 uppercase shrink-0 text-[11px]">Hư Không Ma Thần:</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 via-rose-500 to-amber-400 transition-all duration-150"
                    style={{ width: `${stats.bossHpPercent}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-300 shrink-0 text-[11px]">
                  {Math.round(stats.bossHpPercent)}%
                </span>
              </div>
            )}

            {/* XP Bar */}
            <div className="bg-slate-900/70 px-3 py-1 rounded-lg border border-slate-800 text-[11px] flex items-center gap-2">
              <span className="font-bold text-amber-400 shrink-0 text-[10px] sm:text-[11px]">Kinh Nghiệm</span>
              <div className="flex-1 bg-slate-800 rounded-full h-2 relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150 rounded-full"
                  style={{ width: `${Math.min(100, (stats.xp / stats.xpToNextLevel) * 100)}%` }}
                />
              </div>
              <span className="text-slate-400 shrink-0 text-[10px] font-mono">
                {stats.xp}/{stats.xpToNextLevel} XP
              </span>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div 
            ref={containerRef}
            className="w-full max-w-5xl relative rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-black aspect-[1.6/1] max-h-[72vh] touch-none select-none game-viewport flex items-center justify-center"
          >
            <canvas 
              ref={canvasRef} 
              className="w-full h-full block"
            />

            {/* IN-GAME TOUCH CONTROLS OVERLAY */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20">
              
              {/* Auto-Attack Badge Indicator */}
              <div className="self-center bg-slate-950/70 backdrop-blur-sm border border-slate-700/60 rounded-full px-3 py-0.5 text-[10px] text-slate-300 font-semibold tracking-wide shadow-md pointer-events-none">
                ⚔️ Tự Động Ngắm Quái Gần Nhất
              </div>

              {/* Bottom Controls: Left Joystick, Right Action Buttons */}
              <div className="flex items-end justify-between w-full">
                
                {/* Virtual Joystick (Left Thumb) */}
                <div className="pointer-events-auto pl-1 pb-1">
                  <VirtualJoystick 
                    onMove={(dx, dy) => engineRef.current?.move(dx, dy)}
                    accentColor={selectedSpirit.glowColor || selectedSpirit.color}
                    label="Di Chuyển"
                  />
                </div>

                {/* Action Buttons: Dash & Spirit Ultimate Skill (Right Thumb) */}
                <div className="pointer-events-auto flex items-end gap-3 pb-1 pr-1">
                  
                  {/* Dash Button */}
                  <button
                    type="button"
                    disabled={stats.dashCooldownRemaining > 0}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      navigator.vibrate?.(15);
                      engineRef.current?.dash();
                    }}
                    onClick={() => engineRef.current?.dash()}
                    className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl select-none transition-all active:scale-90 ${
                      stats.dashCooldownRemaining > 0
                        ? 'bg-slate-900/80 border-slate-700/60 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-900/90 border-sky-400/80 hover:border-sky-300 text-sky-200 shadow-sky-500/20 active:bg-sky-950'
                    }`}
                  >
                    <FastForward className="w-6 h-6" />
                    <span className="text-[10px] font-bold tracking-tight mt-0.5">Lướt</span>

                    {/* Cooldown Overlay */}
                    {stats.dashCooldownRemaining > 0 && (
                      <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center text-xs font-mono font-bold text-sky-300">
                        {stats.dashCooldownRemaining}s
                      </div>
                    )}
                  </button>

                  {/* Spirit Ultimate Skill Button */}
                  <button
                    type="button"
                    disabled={stats.skillCooldownRemaining > 0}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      navigator.vibrate?.(25);
                      engineRef.current?.triggerSkill();
                    }}
                    onClick={() => engineRef.current?.triggerSkill()}
                    style={{
                      borderColor: stats.skillCooldownRemaining > 0 ? undefined : selectedSpirit.color,
                      boxShadow: stats.skillCooldownRemaining > 0 ? undefined : `0 0 18px ${selectedSpirit.color}60`
                    }}
                    className={`relative w-17 h-17 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center shadow-2xl select-none transition-all active:scale-90 ${
                      stats.skillCooldownRemaining > 0
                        ? 'bg-slate-900/80 border-slate-700/60 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/90 text-amber-200 active:brightness-125'
                    }`}
                  >
                    <Sparkles className="w-7 h-7" style={{ color: selectedSpirit.color }} />
                    <span className="text-[10px] font-black uppercase tracking-tight line-clamp-1 max-w-[62px] text-center mt-0.5">
                      {selectedSpirit.skillName.split(' ')[0]}
                    </span>

                    {/* Cooldown Overlay */}
                    {stats.skillCooldownRemaining > 0 && (
                      <div className="absolute inset-0 bg-black/80 rounded-2xl flex items-center justify-center text-sm font-mono font-black text-amber-300">
                        {stats.skillCooldownRemaining}s
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* LEVEL UP MODAL: CHOOSE 1 OF 3 UPGRADES */}
            <AnimatePresence>
              {levelUpChoices && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 z-40 overflow-y-auto"
                >
                  <div className="text-center mb-3">
                    <span className="text-amber-400 font-bold uppercase tracking-widest text-[11px] sm:text-xs">Level Up!</span>
                    <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                      Chọn 1 Trong 3 Nâng Cấp
                    </h2>
                    <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5">Xây dựng sức mạnh độc nhất cho Thần Thú của bạn</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-2xl">
                    {levelUpChoices.map((choice) => {
                      const rarityColor = 
                        choice.rarity === 'LEGENDARY' ? '#F59E0B' :
                        choice.rarity === 'EPIC' ? '#A855F7' :
                        choice.rarity === 'RARE' ? '#3B82F6' : '#94A3B8';

                      return (
                        <div
                          key={choice.id}
                          onClick={() => chooseUpgrade(choice)}
                          className="cursor-pointer bg-slate-900/95 hover:bg-slate-800/95 rounded-xl p-3 sm:p-4 border transition-all hover:scale-102 active:scale-98 flex flex-col justify-between text-left relative group shadow-lg"
                          style={{ borderColor: `${rarityColor}80` }}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono"
                                style={{ color: rarityColor, backgroundColor: `${rarityColor}20` }}
                              >
                                {choice.rarity}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase">{choice.category}</span>
                            </div>

                            <h3 className="font-bold text-sm text-white mb-1 group-hover:text-amber-300 transition-colors">
                              {choice.name}
                            </h3>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {choice.description}
                            </p>
                          </div>

                          <Button 
                            size="sm"
                            className="w-full mt-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs transition-colors py-2"
                          >
                            Chọn Nâng Cấp
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* IN-RUN EVENT MODAL */}
            <AnimatePresence>
              {activeEvent && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-40"
                >
                  <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-center">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
                      <Sparkles className="w-6 h-6" />
                    </div>

                    <h3 className="text-xl font-black text-white uppercase tracking-wide mb-1">
                      {activeEvent.title}
                    </h3>
                    <p className="text-xs text-amber-300 font-medium mb-2">{activeEvent.subtitle}</p>
                    <p className="text-xs text-slate-300 mb-5 leading-relaxed">{activeEvent.description}</p>

                    <div className="flex flex-col gap-2.5">
                      {activeEvent.choices.map((choice, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveEvent(null);
                            choice.onChoose();
                          }}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            choice.riskType === 'RISK'
                              ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40 text-amber-200'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-200'
                          }`}
                        >
                          <div className="font-bold text-sm flex items-center justify-between">
                            <span>{choice.label}</span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-mono bg-black/40">
                              {choice.riskType === 'RISK' ? 'Mạo Hiểm' : 'An Toàn'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 mt-1">{choice.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PAUSE MODAL */}
            <AnimatePresence>
              {isGamePaused && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-40"
                >
                  <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 sm:p-6 max-w-sm w-full text-center shadow-2xl">
                    <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                      Tạm Dừng (Paused)
                    </h3>
                    <p className="text-xs text-slate-400 mb-5">Đấu trường đang được giữ nguyên trạng thái</p>

                    {/* Run stats in pause modal */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs mb-5">
                      <div>
                        <div className="text-slate-400 text-[10px]">Đợt</div>
                        <div className="font-bold text-amber-400">{stats.currentWave}/{stats.totalWaves}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">Cấp Độ</div>
                        <div className="font-bold text-cyan-400">{stats.level}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">Tiêu Diệt</div>
                        <div className="font-bold text-rose-400">{stats.enemiesKilled}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <Button
                        onClick={resumeGame}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 text-sm rounded-xl"
                      >
                        Tiếp Tục Chiến Đấu
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={toggleSound}
                        className="w-full py-2.5 text-xs rounded-xl border-slate-700 text-slate-300"
                      >
                        {isMuted ? '🔊 Bật Âm Thanh' : '🔇 Tắt Âm Thanh'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsGamePaused(false);
                          handleAbandon();
                        }}
                        className="w-full text-rose-400 hover:text-rose-300 text-xs py-2"
                      >
                        Rời Khỏi Đấu Trường
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action & Control Bar for Desktop */}
          <div className="w-full max-w-5xl flex items-center justify-between mt-2 px-2">
            <div className="text-xs text-slate-500 hidden sm:block">
              Phím: <strong>WASD / Mũi Tên</strong> = Di Chuyển | <strong>Space / Shift</strong> = Lướt | <strong>E / Q</strong> = Chiêu Thức
            </div>

            <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Skill Button */}
              <Button
                onClick={() => engineRef.current?.triggerSkill()}
                disabled={stats.skillCooldownRemaining > 0}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-transform"
              >
                {stats.skillCooldownRemaining > 0 
                  ? `Chiêu (${stats.skillCooldownRemaining}s)` 
                  : `✨ ${selectedSpirit.skillName.split(' ')[0]} (E)`}
              </Button>

              {/* Dash Button */}
              <Button
                onClick={() => engineRef.current?.dash()}
                disabled={stats.dashCooldownRemaining > 0}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-slate-700 active:scale-95 transition-transform"
              >
                {stats.dashCooldownRemaining > 0 
                  ? `Lướt (${stats.dashCooldownRemaining}s)` 
                  : '💨 Lướt (Space)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- SCREEN 3: RUN RESULT & MYSTERY GUESS --- */}
      {gameState === 'RESULT' && finalResult && (
        <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6"
          >
            {/* Victory / Defeat Header */}
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
                finalResult.victory 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {finalResult.victory ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
              </div>

              <h2 className="text-2xl font-black uppercase tracking-wide text-white">
                {finalResult.victory ? 'Chiến Thắng - Cổ Thần Bị Đánh Bại!' : 'Linh Hồn Sa Ngã (Spirit Fallen)'}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                {finalResult.victory 
                  ? 'Bạn đã thanh tẩy hoàn toàn Đấu Trường và đập tan bóng tối Hư Không!' 
                  : 'Sức cùng lực kiệt giữa bầy quái vật. Hãy rèn luyện thần thú và thử lại!'}
              </p>
            </div>

            {/* Run Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-center">
              <div>
                <div className="text-slate-400 text-xs">Quái Đã Diệt</div>
                <div className="text-base font-black text-rose-400 mt-0.5">{finalResult.enemiesKilled}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Cấp Độ Đạt Được</div>
                <div className="text-base font-black text-amber-300 mt-0.5">Lv. {finalResult.level}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Xu Vàng Nhận Được</div>
                <div className="text-base font-black text-amber-400 mt-0.5">+{finalResult.coins}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs">Kinh Nghiệm (XP)</div>
                <div className="text-base font-black text-indigo-400 mt-0.5">+{finalResult.xpEarned}</div>
              </div>
            </div>

            {/* Final Roguelite Build */}
            {finalResult.upgrades.length > 0 && (
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Bộ Nâng Cấp Đã Chọn Trong Lượt Này (Build):
                </h3>
                <div className="flex flex-wrap gap-2">
                  {finalResult.upgrades.map((item, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5"
                    >
                      <span>{item.def.name}</span>
                      <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1 py-0.2 rounded">
                        Lv.{item.level}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mystery Target Guessing */}
            <div className="bg-slate-950/60 border border-purple-500/30 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-purple-300">
                    Giải Mã Ẩn Số (Mystery Target)
                  </h3>
                </div>
                <span className="text-xs text-purple-400 font-mono font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {finalResult.clues}/3 Mảnh Manh Mối
                </span>
              </div>

              {/* Hints */}
              <div className="flex flex-col gap-2 mb-4">
                {hints.map((hint, idx) => {
                  const isUnlocked = idx < finalResult.clues || guessResult?.isCorrect;
                  return (
                    <div 
                      key={idx}
                      className={`p-2.5 rounded-lg text-xs flex items-start gap-2.5 transition-colors ${
                        isUnlocked 
                          ? 'bg-purple-950/40 text-purple-100 border border-purple-500/30' 
                          : 'bg-slate-900/60 text-slate-500 border border-slate-800'
                      }`}
                    >
                      <span className="font-bold text-purple-400 shrink-0">Manh mối {idx + 1}:</span>
                      <span>{isUnlocked ? hint : 'Chưa mở khóa (Tiêu diệt Elite & Boss trong Arena để nhặt)'}</span>
                    </div>
                  );
                })}
              </div>

              {guessResult?.isCorrect ? (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl text-center">
                  <div className="text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Đoán Chính Xác Ẩn Số!
                  </div>
                  <div className="text-white text-base font-black">
                    {guessResult.canonicalName}
                  </div>
                  <div className="text-xs text-emerald-300/80 mt-1">
                    +150 XP & +50 Xu Thưởng Giải Mã!
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                      placeholder="Nhập tên thần thú / đối tượng bí ẩn..."
                      className="flex-1 bg-slate-900 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-purple-400"
                    />
                    <Button 
                      onClick={submitGuess}
                      disabled={isSubmittingGuess || !guessInput.trim()}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 rounded-xl shrink-0"
                    >
                      {isSubmittingGuess ? 'Đang gửi...' : 'Đoán Ngay'}
                    </Button>
                  </div>

                  {guessError && (
                    <div className="text-rose-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {guessError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={startArena}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs px-6 py-3 rounded-xl flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <RotateCcw className="w-4 h-4" />
                Chơi Lượt Mới (New Run)
              </Button>

              <Button
                variant="secondary"
                onClick={() => setGameState('SELECT')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-3 rounded-xl border border-slate-700"
              >
                Đổi Thần Thú / Võ Đài
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="text-slate-400 hover:text-white text-xs"
              >
                Về Sảnh
              </Button>
            </div>
          </motion.div>
        </main>
      )}
    </div>
  );
}
