import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Award, BookOpen, Crown, Swords } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';

export default function Leaderboard() {
  const [category, setCategory] = useState<'OVERALL' | 'RUNNER' | 'COLLECTION' | 'STREAK' | 'ARENA'>('OVERALL');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard(category);
  }, [category]);

  const fetchLeaderboard = async (cat: string) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/leaderboard?category=${cat}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPlayers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'OVERALL', label: 'Tổng Điểm Tu Luyện', icon: Trophy },
    { id: 'ARENA', label: 'Đấu Trường Thời Gian Thực', icon: Swords },
    { id: 'RUNNER', label: 'Cao Thủ Chạy Vượt Ải', icon: Flame },
    { id: 'COLLECTION', label: 'Bậc Thầy Sưu Tầm', icon: BookOpen },
    { id: 'STREAK', label: 'Chuỗi Ngày Đăng Nhập', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider">
            Bảng Vàng Danh Dự Linh Giới
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Tôn vinh những tu sĩ xuất sắc nhất trên khắp các linh cảnh
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setCategory(tab.id as any);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Leaderboard Table / Cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse text-sm">
              Đang tải danh sách cao thủ...
            </div>
          ) : players.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Chưa có dữ liệu thi đấu trong hạng mục này. Hãy là người đầu tiên ghi danh!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {players.map((player, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-4 sm:px-6 transition hover:bg-slate-800/40 ${
                      isTop1 ? 'bg-amber-500/5' : isTop2 ? 'bg-slate-800/20' : isTop3 ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        isTop1
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : isTop2
                          ? 'bg-slate-400 text-slate-950'
                          : isTop3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isTop1 ? <Crown className="w-4 h-4" /> : idx + 1}
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
                          <span>{player.username}</span>
                          {isTop1 && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                              QUÁN QUÂN
                            </span>
                          )}
                        </div>
                        {player.level && (
                          <div className="text-xs text-slate-500">Cấp {player.level}</div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black font-mono text-amber-400">
                        {player.score?.toLocaleString() ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        {category === 'RUNNER' ? 'Điểm Kỷ Lục' : category === 'COLLECTION' ? 'Linh Thú' : category === 'STREAK' ? 'Ngày Liên Tiếp' : 'Tổng Tu Vi'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
