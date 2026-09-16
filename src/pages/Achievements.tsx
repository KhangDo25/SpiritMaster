import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, Lock, Coins, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';

export default function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAchievements(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">Hệ Thống Thành Tựu</h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Hoàn thành thử thách để nhận vinh danh, điểm tu vi và ngân lượng dồi dào
              </p>
            </div>
          </div>
          <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Tiến Độ Mở Khóa</div>
            <div className="text-xl font-black text-amber-400">
              {unlockedCount} / {achievements.length}
            </div>
          </div>
        </div>

        {/* Achievement List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse text-sm">
            Đang tải dữ liệu thành tựu...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map(ach => (
              <div
                key={ach.id}
                className={`p-5 rounded-2xl border transition ${
                  ach.isUnlocked
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900/40 border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      ach.isUnlocked ? 'bg-emerald-500/20' : 'bg-slate-800'
                    }`}>
                      {ach.icon || '🏆'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-200">{ach.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{ach.description}</p>
                    </div>
                  </div>

                  {ach.isUnlocked ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Đã đạt</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold bg-slate-800 px-2.5 py-1 rounded-full flex-shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Chưa mở</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Coins className="w-3.5 h-3.5" /> +{ach.rewardCoins} Xu
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" /> +{ach.rewardXp} Tu Vi
                    </span>
                  </div>
                  {ach.unlockedAt && (
                    <span className="text-[11px] text-slate-500">
                      {new Date(ach.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
