import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { soundEngine } from '../../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Coins, 
  Volume2, 
  VolumeX, 
  LogOut, 
  Sparkles,
  LayoutGrid,
  X,
  Trophy,
  ShoppingBag,
  BookOpen,
  Award,
  Calendar,
  User,
  Shield,
  Home
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    if (!muted) soundEngine.playClick();
  };

  const handleLogout = () => {
    soundEngine.playClick();
    logout();
    navigate('/login');
  };

  const secondaryMenu = [
    { label: 'Trang Chủ', path: '/dashboard', icon: Home, color: 'text-amber-400', bg: 'hover:border-amber-500/50' },
    { label: 'Bộ Sưu Tập', path: '/collection', icon: BookOpen, color: 'text-emerald-400', bg: 'hover:border-emerald-500/50' },
    { label: 'Cửa Hàng', path: '/shop', icon: ShoppingBag, color: 'text-rose-400', bg: 'hover:border-rose-500/50' },
    { label: 'Chiến Giới (Pass)', path: '/battlepass', icon: Sparkles, color: 'text-purple-400', bg: 'hover:border-purple-500/50' },
    { label: 'Bảng Xếp Hạng', path: '/leaderboard', icon: Trophy, color: 'text-yellow-400', bg: 'hover:border-yellow-500/50' },
    { label: 'Sự Kiện', path: '/events', icon: Calendar, color: 'text-cyan-400', bg: 'hover:border-cyan-500/50' },
    { label: 'Thành Tựu', path: '/achievements', icon: Award, color: 'text-indigo-400', bg: 'hover:border-indigo-500/50' },
    { label: 'Hồ Sơ Cá Nhân', path: '/profile', icon: User, color: 'text-sky-400', bg: 'hover:border-sky-500/50' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 text-slate-100 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo Game Rực Rỡ */}
            <Link 
              to="/dashboard" 
              onClick={() => soundEngine.playClick()} 
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition duration-300">
                  <Flame className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl blur-sm opacity-40 group-hover:opacity-80 transition duration-300 -z-10" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg sm:text-2xl tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent font-serif drop-shadow-sm">
                  LINH THÚ HỘI
                </span>
                <span className="text-[10px] font-mono tracking-widest text-amber-500/80 uppercase font-semibold">
                  Huyền Thoại Ngũ Hành
                </span>
              </div>
            </Link>

            {/* Header Right: Stats, Sound, Avatar & Compact Menu Icon */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 flex items-center justify-center text-slate-300 transition border border-slate-800 shadow hover:border-slate-700"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                )}
              </button>

              {/* User Coins & Level */}
              {user && (
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/90 px-3 py-1.5 rounded-xl shadow-inner">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm">
                    <Coins className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                    <span>{user.profile?.coins?.toLocaleString() ?? 500}</span>
                  </div>
                  <div className="w-px h-3.5 bg-slate-800" />
                  <div className="flex items-center gap-1 text-indigo-300 font-extrabold text-xs">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Lv.{user.profile?.level ?? 1}</span>
                  </div>
                </div>
              )}

              {/* Compact Menu Button */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsMenuOpen(!isMenuOpen)}
                }
                className="relative p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/60 text-indigo-200 transition flex items-center gap-2 shadow-lg shadow-indigo-950/40"
                title="Mở bảng điều hướng phụ"
              >
                <LayoutGrid className="w-5 h-5 text-indigo-300" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Menu
                </span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Slide-out Compact Drawer Menu for Secondary Features */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        Linh Điện & Tiện Ích
                      </h3>
                      <p className="text-[11px] text-slate-400">Tính năng phụ trợ Thần Sứ</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Card inside Drawer */}
                {user && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white leading-tight">{user.username}</div>
                        <div className="text-xs text-amber-400 font-semibold mt-0.5">
                          {user.profile?.coins?.toLocaleString() ?? 500} Xu Linh Thú
                        </div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                      Lv.{user.profile?.level ?? 1}
                    </div>
                  </div>
                )}

                {/* Grid of Secondary Options */}
                <div className="grid grid-cols-2 gap-3">
                  {secondaryMenu.map(item => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          soundEngine.playClick();
                          setIsMenuOpen(false);
                        }}
                        className={`p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center text-center gap-2 group transition duration-200 ${item.bg}`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-white transition">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer: Logout */}
              <div className="pt-6 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 px-4 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng Xuất Khỏi Thần Điện</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
