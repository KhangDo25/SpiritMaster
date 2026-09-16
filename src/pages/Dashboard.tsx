import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';
import { normalizeGameMode } from '../types/gameMode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  Users, 
  Paintbrush, 
  Flame, 
  Sparkles, 
  ArrowLeft, 
  Zap, 
  Shield, 
  Droplets, 
  Leaf, 
  Moon, 
  Sun, 
  Trophy, 
  Play, 
  Plus, 
  LogIn, 
  Crown,
  Skull,
  CheckCircle2,
  Coins,
  ChevronRight,
  Swords,
  Timer,
  HelpCircle,
  Footprints,
  Shuffle
} from 'lucide-react';

type ScreenView = 'HOME' | 'SINGLE_PLAYER' | 'MULTIPLAYER';

interface RealmCard {
  id: string;
  realm: string;
  name: string;
  title: string;
  icon: any;
  color: string;
  glowColor: string;
  bgGradient: string;
  borderGradient: string;
  perk: string;
  stats: { atk: string; spd: string; def: string };
}

const REALM_CARDS: RealmCard[] = [
  {
    id: 'hoa',
    realm: 'HỎA',
    name: 'Phượng Hoàng Lửa',
    title: 'Thần Điểu Bất Diệt',
    icon: Flame,
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    bgGradient: 'from-red-950/80 via-orange-950/50 to-slate-950',
    borderGradient: 'from-amber-500 via-rose-500 to-red-600',
    perk: 'Nộ Hỏa: Tăng 30% tốc độ chạy vượt ải & nhân đôi sát thương bộc phá.',
    stats: { atk: '95', spd: '90', def: '65' }
  },
  {
    id: 'thuy',
    realm: 'THỦY',
    name: 'Hồ Ly Băng',
    title: 'Cửu Vĩ Băng Thủy',
    icon: Droplets,
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    bgGradient: 'from-cyan-950/80 via-blue-950/50 to-slate-950',
    borderGradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    perk: 'Hàn Băng: Làm chậm chướng ngại vật & kéo dài thời gian đoán thêm 5 giây.',
    stats: { atk: '75', spd: '85', def: '90' }
  },
  {
    id: 'moc',
    realm: 'MỘC',
    name: 'Linh Dương Rừng Thiêng',
    title: 'Hộ Thần Rừng Xanh',
    icon: Leaf,
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    bgGradient: 'from-emerald-950/80 via-teal-950/50 to-slate-950',
    borderGradient: 'from-emerald-400 via-green-500 to-teal-600',
    perk: 'Sinh Mệnh: Ban 1 lá chắn miễn nhiễm 1 lần va chạm chướng ngại vật.',
    stats: { atk: '65', spd: '80', def: '100' }
  },
  {
    id: 'loi',
    realm: 'LÔI',
    name: 'Thần Sói Lôi Điện',
    title: 'Cuồng Lang Sấm Sét',
    icon: Zap,
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    bgGradient: 'from-amber-950/80 via-yellow-950/50 to-slate-950',
    borderGradient: 'from-amber-400 via-yellow-500 to-purple-600',
    perk: 'Lôi Kích: Bứt tốc siêu thanh & nhân đôi điểm thưởng khi nhặt linh thạch.',
    stats: { atk: '100', spd: '95', def: '60' }
  },
  {
    id: 'anh',
    realm: 'ẢNH',
    name: 'Mèo Bóng Tối',
    title: 'Ảnh Miêu Dạ Nguyệt',
    icon: Moon,
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.6)',
    bgGradient: 'from-purple-950/80 via-indigo-950/50 to-slate-950',
    borderGradient: 'from-purple-500 via-indigo-600 to-slate-800',
    perk: 'Vô Ảnh: Tàng hình xuyên qua bẫy gai đầu tiên mà không mất máu.',
    stats: { atk: '85', spd: '100', def: '70' }
  },
  {
    id: 'quang',
    realm: 'QUANG',
    name: 'Kỳ Lân Thánh Quang',
    title: 'Thánh Thú Thái Dương',
    icon: Sun,
    color: '#FBBF24',
    glowColor: 'rgba(251, 191, 36, 0.7)',
    bgGradient: 'from-yellow-950/80 via-amber-950/50 to-slate-950',
    borderGradient: 'from-yellow-300 via-amber-400 to-amber-600',
    perk: 'Quang Năng: Nam châm tự động hút toàn bộ vàng và linh thạch trong màn.',
    stats: { atk: '90', spd: '85', def: '95' }
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<ScreenView>('HOME');
  const [selectedRealm, setSelectedRealm] = useState<RealmCard | null>(null);
  
  // Quick Room Join State
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [creatingMode, setCreatingMode] = useState<string | null>(null);

  // Quests mini bar
  const [quests, setQuests] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/quests')
      .then(res => res.json())
      .then(data => {
        if (data.success) setQuests(data.data || []);
      })
      .catch(() => {});
  }, []);

  const handleCreateRoomWithMode = async (targetMode: string) => {
    soundEngine.playClick();
    setCreatingMode(targetMode);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          mode: normalizeGameMode(targetMode),
          theme: 'forest_1',
          maxRounds: 3,
          roundTimeSeconds: 60,
          maxPlayers: 12
        })
      });
      const data = await res.json();
      const roomId = data.data?.id || data.data?.roomId;
      if (data.success && roomId) {
        soundEngine.playVictory();
        navigate(`/multiplayer/lobby/${roomId}`);
      } else {
        alert(data.message || 'Không thể tạo phòng thi đấu');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ khi tạo phòng');
    } finally {
      setCreatingMode(null);
    }
  };

  const handleCreateDrawRoom = () => handleCreateRoomWithMode('DRAW_GUESS');

  const handleQuickJoinRoom = async () => {
    if (!joinCode.trim() || joinCode.length < 4) return;
    soundEngine.playClick();
    setIsJoining(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ code: joinCode.toUpperCase().trim() })
      });
      const data = await res.json();
      if (data.success && data.data?.roomId) {
        soundEngine.playVictory();
        navigate(`/multiplayer/lobby/${data.data.roomId}`);
      } else {
        soundEngine.playWrong();
        alert(data.message || 'Mã phòng không tồn tại hoặc đã đầy');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  const startSinglePlayer = (realmName: string) => {
    soundEngine.playClick();
    soundEngine.playVictory();
    navigate(`/single-player?realm=${encodeURIComponent(realmName)}`);
  };

  return (
    <div className="relative flex-1 min-h-[calc(100vh-5rem)] flex flex-col justify-between overflow-hidden select-none bg-slate-950 text-white">
      {/* Mystical Background Atmospheric Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 via-rose-600/10 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ========================================================= */}
          {/* VIEW 1: HOME - 2 GIANT HERO BUTTONS & GRAND GAME FEEL */}
          {/* ========================================================= */}
          {activeView === 'HOME' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center text-center my-auto space-y-8 sm:space-y-12"
            >
              {/* Grand Mythological Emblem Logo */}
              <div className="flex flex-col items-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="relative"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-600 p-1 shadow-[0_0_50px_rgba(245,158,11,0.4)]">
                    <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent" />
                      <Flame className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400 drop-shadow-[0_0_16px_rgba(245,158,11,0.9)] animate-pulse" />
                    </div>
                  </div>
                  <Sparkles className="absolute -top-3 -right-3 w-8 h-8 text-amber-300 animate-spin" />
                </motion.div>

                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-serif tracking-widest bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)]">
                    LINH THÚ HỘI
                  </h1>
                  <p className="text-xs sm:text-base md:text-lg font-medium tracking-widest text-slate-300/90 uppercase max-w-xl mx-auto">
                    Huyền Thoại Ngũ Hành &bull; Đấu Trường Vẽ & Đoán Thời Gian Thực
                  </p>
                </div>
              </div>

              {/* 2 NÚT BẤM KHỔNG LỒ (HERO BUTTONS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-2">
                {/* HERO BUTTON 1: CHƠI ĐƠN */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveView('SINGLE_PLAYER');
                  }}
                  className="group relative h-36 sm:h-44 rounded-3xl p-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition duration-300 text-left overflow-hidden"
                >
                  <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 rounded-[22px] p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
                    {/* Background light glow */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-150 transition duration-500 pointer-events-none" />
                    
                    <div className="space-y-2 z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                        <Flame className="w-3.5 h-3.5" />
                        Chế Độ Khám Phá
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-white group-hover:text-emerald-300 transition">
                        CHƠI ĐƠN
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 font-medium">
                        Chạy vượt ải 6 Linh Giới & Khiêu chiến Boss
                      </p>
                    </div>

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition duration-300 shadow-xl z-10">
                      <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  </div>
                </motion.button>

                {/* HERO BUTTON 2: MULTIPLAYER / ĐẤU TRƯỜNG */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveView('MULTIPLAYER');
                  }}
                  className="group relative h-36 sm:h-44 rounded-3xl p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] transition duration-300 text-left overflow-hidden"
                >
                  <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 rounded-[22px] p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
                    {/* Background light glow */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl group-hover:scale-150 transition duration-500 pointer-events-none" />

                    <div className="space-y-2 z-10">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                        <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
                        Đại Hội Vẽ & Đoán
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-white group-hover:text-indigo-300 transition">
                        ĐẤU TRƯỜNG
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 font-medium">
                        Tạo phòng thi đấu nhiều người chơi thời gian thực
                      </p>
                    </div>

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition duration-300 shadow-xl z-10">
                      <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Bottom Quick Quest Ribbon (Compact Game Progression) */}
              {quests.length > 0 && (
                <div className="w-full max-w-4xl p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 text-left shadow-lg">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-300 block truncate">
                        Nhiệm Vụ: {quests[0].title}
                      </span>
                      <span className="text-[11px] text-amber-400 font-medium">
                        Thưởng: +{quests[0].rewardCoins} Xu Linh Thú
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      navigate('/achievements');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 shrink-0 flex items-center gap-1 transition"
                  >
                    <span>Xem Tất Cả</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: CHƠI ĐƠN - 6 LINH GIỚI & BOSS KHIÊU CHIẾN */}
          {/* ========================================================= */}
          {activeView === 'SINGLE_PLAYER' && (
            <motion.div
              key="single_player"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 w-full max-w-6xl mx-auto"
            >
              {/* Header Navigation */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveView('HOME');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Trở Về Sảnh Chính</span>
                </button>

                <div className="text-left sm:text-right">
                  <h2 className="text-xl sm:text-2xl font-black text-amber-300 uppercase tracking-widest font-serif">
                    CHỌN LINH GIỚI XUẤT TRẬN
                  </h2>
                  <p className="text-xs text-slate-400">
                    Mỗi nguyên tố sở hữu năng lực thần thú độc nhất vô nhị
                  </p>
                </div>
              </div>

              {/* 6 Elemental Spirit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {REALM_CARDS.map(card => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.id}
                      whileHover={{ scale: 1.03, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className={`relative rounded-3xl p-1 bg-gradient-to-b ${card.borderGradient} shadow-xl hover:shadow-[0_0_35px_${card.glowColor}] transition duration-300`}
                    >
                      <div className={`w-full h-full rounded-[22px] bg-gradient-to-b ${card.bgGradient} p-5 sm:p-6 flex flex-col justify-between space-y-4`}>
                        {/* Top Tag & Realm Icon */}
                        <div className="flex items-center justify-between">
                          <span 
                            className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border border-white/20 shadow-sm"
                            style={{ backgroundColor: `${card.color}25`, color: card.color }}
                          >
                            Hệ {card.realm}
                          </span>

                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20"
                            style={{ backgroundColor: `${card.color}30`, color: card.color }}
                          >
                            <Icon className="w-6 h-6 drop-shadow" />
                          </div>
                        </div>

                        {/* Spirit Identity */}
                        <div>
                          <h3 className="text-xl font-black text-white tracking-wide">
                            {card.name}
                          </h3>
                          <span className="text-xs font-semibold text-slate-400">
                            {card.title}
                          </span>
                          <p className="mt-2 text-xs text-slate-300 font-medium leading-relaxed min-h-[36px]">
                            {card.perk}
                          </p>
                        </div>

                        {/* Elemental Stats */}
                        <div className="grid grid-cols-3 gap-2 bg-black/40 border border-white/10 rounded-xl p-2.5 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">CÔNG</span>
                            <span className="font-mono font-black text-rose-400">{card.stats.atk}</span>
                          </div>
                          <div className="border-x border-white/10">
                            <span className="text-[10px] text-slate-400 block font-bold">TỐC</span>
                            <span className="font-mono font-black text-cyan-400">{card.stats.spd}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">THỦ</span>
                            <span className="font-mono font-black text-emerald-400">{card.stats.def}</span>
                          </div>
                        </div>

                        {/* Action Launch */}
                        <button
                          type="button"
                          onClick={() => startSinglePlayer(card.realm)}
                          className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-slate-950 flex items-center justify-center gap-2 transition duration-200 shadow-lg hover:brightness-110 active:scale-95"
                          style={{ backgroundColor: card.color }}
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>Xuất Trận Khám Phá</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Special Challenge: Boss Run */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-800/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl shrink-0">
                    <Skull className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                      Khiêu Chiến Boss Hư Không (Boss Run)
                    </h3>
                    <p className="text-xs sm:text-sm text-purple-200/80">
                      Vượt qua ác linh cổ đại để mở khóa Thần Thú Thứ 7 (Hư Không) cùng danh hiệu cao quý.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    navigate('/boss');
                  }}
                  className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-600/30 transition duration-200 shrink-0 flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>Vào Ải Trảm Boss</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* VIEW 3: MULTIPLAYER - DRAW & GUESS NỔI BẬT NHẤT */}
          {/* ========================================================= */}
          {activeView === 'MULTIPLAYER' && (
            <motion.div
              key="multiplayer"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 w-full max-w-5xl mx-auto"
            >
              {/* Header Navigation */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveView('HOME');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Trở Về Sảnh Chính</span>
                </button>

                <div className="text-left sm:text-right">
                  <h2 className="text-xl sm:text-2xl font-black text-indigo-300 uppercase tracking-widest font-serif">
                    ĐẤU TRƯỜNG ĐA NGƯỜI CHƠI
                  </h2>
                  <p className="text-xs text-slate-400">
                    Vẽ tranh, đoán từ khóa & tranh tài trực tiếp qua WebSocket
                  </p>
                </div>
              </div>

              {/* CHẾ ĐỘ NỔI BẬT: DRAW & GUESS (VẼ & ĐOÁN) */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="relative rounded-3xl p-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden"
              >
                <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 rounded-[22px] p-6 sm:p-10 relative overflow-hidden">
                  {/* Decorative background glow */}
                  <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 z-10 relative">
                    <div className="space-y-4 max-w-xl">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-xs font-black uppercase tracking-wider text-rose-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        Chế Độ Tâm Điểm &bull; Hot Nhất
                      </div>

                      <h3 className="text-2xl sm:text-4xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
                        🎨 DRAW & GUESS (VẼ & ĐOÁN)
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                        Họa sĩ luân phiên vẽ nét cọ mượt mà mô tả từ khóa Thần Thoại. Tất cả Thần Sứ khác cùng nhập dự đoán trên khung chat để ghi điểm thần tốc và giành chiến thắng vinh quang!
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Users className="w-3.5 h-3.5 text-indigo-400" /> Tối đa 12 người
                        </span>
                        <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Timer className="w-3.5 h-3.5 text-amber-400" /> 60s mỗi lượt vẽ
                        </span>
                        <span className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Paintbrush className="w-3.5 h-3.5 text-rose-400" /> Nét vẽ Vector mượt
                        </span>
                      </div>
                    </div>

                    {/* Direct Action Buttons: Create & Join */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        disabled={creatingMode === 'DRAW_GUESS'}
                        onClick={handleCreateDrawRoom}
                        className="py-4 px-8 rounded-2xl bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2.5 transition transform active:scale-95 disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                        <span>{creatingMode === 'DRAW_GUESS' ? 'Đang Khởi Tạo...' : 'TẠO PHÒNG VẼ NGAY'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          navigate('/rooms/create?mode=DRAW_GUESS');
                        }}
                        className="py-3 px-6 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                      >
                        <Swords className="w-4 h-4 text-indigo-400" />
                        <span>Tùy Chỉnh Phòng Đấu</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Room Code Input Box */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-left w-full md:w-auto">
                  <h4 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-indigo-400" />
                    Vào Phòng Đấu Nhanh
                  </h4>
                  <p className="text-xs text-slate-400">
                    Nhập mã phòng 5 ký tự từ bạn bè để tham chiến ngay
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickJoinRoom()}
                    placeholder="MÃ PHÒNG (VD: K9X27)"
                    className="flex-1 md:w-56 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono font-black text-sm uppercase text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={isJoining || !joinCode.trim()}
                    onClick={handleQuickJoinRoom}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition shrink-0"
                  >
                    {isJoining ? 'Đang Vào...' : 'Vào Phòng'}
                  </button>
                </div>
              </div>

              {/* Secondary Multiplayer Modes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                {/* Mode 1: Draw Battle */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-900/40 hover:border-amber-500/50 transition flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5" /> Đối Kháng
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">2 Họa Sĩ</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition">Vẽ Đối Kháng (Draw Battle)</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      2 họa sĩ song đấu vẽ cùng chủ đề. Khán giả và người chơi bình chọn bức tranh đỉnh cao nhất.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={creatingMode === 'DRAW_BATTLE'}
                      onClick={() => handleCreateRoomWithMode('DRAW_BATTLE')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{creatingMode === 'DRAW_BATTLE' ? 'Đang Tạo...' : 'Tạo Phòng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        navigate('/rooms/create?mode=DRAW_BATTLE');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      title="Tùy chỉnh phòng"
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>

                {/* Mode 2: Guess Rush */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-900/40 hover:border-cyan-500/50 transition flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Siêu Tốc
                      </span>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">Phản Xạ</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">Đoán Tốc Độ (Guess Rush)</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gợi ý hé lộ dần từng giây. Người chơi nhanh tay đoán chính xác từ khóa sẽ giành trọn điểm thưởng.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={creatingMode === 'GUESS_RUSH'}
                      onClick={() => handleCreateRoomWithMode('GUESS_RUSH')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{creatingMode === 'GUESS_RUSH' ? 'Đang Tạo...' : 'Tạo Phòng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        navigate('/rooms/create?mode=GUESS_RUSH');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      title="Tùy chỉnh phòng"
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>

                {/* Mode 3: Spirit Race */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-900/40 hover:border-emerald-500/50 transition flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Footprints className="w-3.5 h-3.5" /> Đua Thần Thú
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">2000m</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition">Đua Linh Thú (Spirit Race)</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Chạy đua thời gian thực trên đường đua chướng ngại vật cùng bạn bè, bứt tốc về đích.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={creatingMode === 'SPIRIT_RACE'}
                      onClick={() => handleCreateRoomWithMode('SPIRIT_RACE')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{creatingMode === 'SPIRIT_RACE' ? 'Đang Tạo...' : 'Tạo Phòng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        navigate('/rooms/create?mode=SPIRIT_RACE');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      title="Tùy chỉnh phòng"
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>

                {/* Mode 4: Bluff */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-900/40 hover:border-purple-500/50 transition flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" /> Đấu Trí
                      </span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">Bẫy Lừa</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition">Bẫy Lừa Bí Ẩn (Bluff)</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sáng tạo đáp án giả thật thuyết phục để gài bẫy người chơi khác bầu chọn và giành điểm.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={creatingMode === 'BLUFF'}
                      onClick={() => handleCreateRoomWithMode('BLUFF')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{creatingMode === 'BLUFF' ? 'Đang Tạo...' : 'Tạo Phòng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        navigate('/rooms/create?mode=BLUFF');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      title="Tùy chỉnh phòng"
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>

                {/* Mode 5: Random Rotation */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-900/40 hover:border-indigo-500/50 transition flex flex-col justify-between space-y-4 shadow-lg group">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5" /> Hỗn Hợp
                      </span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">Xoay Tua</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition">Ngẫu Nhiên (Random)</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tự động luân chuyển ngẫu nhiên giữa 5 chế độ qua từng vòng đấu, tạo bất ngờ liên tục.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={creatingMode === 'RANDOM'}
                      onClick={() => handleCreateRoomWithMode('RANDOM')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{creatingMode === 'RANDOM' ? 'Đang Tạo...' : 'Tạo Phòng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        navigate('/rooms/create?mode=RANDOM');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      title="Tùy chỉnh phòng"
                    >
                      Tùy chỉnh
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
