import React, { useState, useEffect } from 'react';
import { User, Award, BookOpen, Flame, Trophy, Coins, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';

export default function Profile() {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProfileData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse text-sm">Đang tải hồ sơ linh tu...</div>
      </div>
    );
  }

  const { user, profile, stats, equippedCosmetics = [], achievements = [] } = profileData || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-4xl shadow-xl relative flex-shrink-0">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-3xl" />
            ) : (
              '🧙‍♂️'
            )}
            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full border-2 border-slate-900 shadow">
              Lv.{profile?.level || 1}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-white">{user?.username}</h1>
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-slate-400 text-xs">
              Tu Sĩ Linh Giới • Gia nhập {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl">
                <Coins className="w-3.5 h-3.5" /> {profile?.coins?.toLocaleString() || 0} Xu
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-xl">
                <Sparkles className="w-3.5 h-3.5" /> {profile?.totalXp?.toLocaleString() || 0} Tu Vi
              </span>
            </div>
          </div>
        </div>

        {/* Career Statistics Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Sưu Tầm Linh Thú
            </div>
            <div className="text-2xl font-black text-white">{stats?.collectionPercent || 0}%</div>
            <div className="text-[11px] text-slate-500">{stats?.ownedSpiritsCount || 0} / {stats?.totalSpiritsCount || 7} linh thú</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <Flame className="w-4 h-4 text-rose-400" /> Kỷ Lục Vượt Ải
            </div>
            <div className="text-2xl font-black text-white">{stats?.runnerHighScore?.toLocaleString() || 0}</div>
            <div className="text-[11px] text-slate-500">{stats?.runnerTotalRuns || 0} lần chinh phục</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" /> Đấu Đội Thắng
            </div>
            <div className="text-2xl font-black text-white">{stats?.multiplayerWins || 0}</div>
            <div className="text-[11px] text-slate-500">Tỷ lệ thắng: {stats?.winRate || '65%'}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-indigo-400" /> Chuỗi Ngày Tu Luyện
            </div>
            <div className="text-2xl font-black text-white">{stats?.currentStreak || 1} ngày</div>
            <div className="text-[11px] text-slate-500">Kỷ lục: {stats?.longestStreak || 1} ngày</div>
          </div>
        </div>

        {/* Equipped Cosmetics & Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equipped items */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider">
              Vật Phẩm Đang Trang Bị
            </h2>
            {equippedCosmetics.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Chưa trang bị vật phẩm nào. Ghé thăm Cửa Hàng để trang bị!
              </div>
            ) : (
              <div className="space-y-2">
                {equippedCosmetics.map((cosmetic: any) => (
                  <div
                    key={cosmetic.cosmeticId}
                    className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-200">{cosmetic.name}</span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">
                      {cosmetic.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unlocked Achievements */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider">
              Huy Hiệu Đạt Được ({achievements.length})
            </h2>
            {achievements.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Chưa đạt huy hiệu nào. Hãy tham gia thi đấu để mở khóa!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((ach: any) => (
                  <div
                    key={ach.code}
                    className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-slate-200"
                  >
                    <span className="text-xl">{ach.icon || '🏆'}</span>
                    <span className="font-semibold truncate">{ach.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
