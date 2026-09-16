import React, { useState, useEffect } from 'react';
import { Sparkles, Crown, Check, Lock, Gift, Coins, Award } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';

export default function BattlePass() {
  const [passData, setPassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBattlePass();
  }, []);

  const fetchBattlePass = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/battlepass', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPassData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (tier: number, isPremium: boolean) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/battlepass/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier, isPremium })
      });
      const data = await res.json();
      if (data.success) {
        soundEngine.playCoin();
        setMessage(`Đã nhận phần thưởng Cấp ${tier}! (+${data.data.coinsEarned} Xu)`);
        fetchBattlePass();
      } else {
        soundEngine.playWrong();
        setMessage(data.message);
      }
    } catch (err: any) {
      soundEngine.playWrong();
      setMessage(err.message);
    }
  };

  const handleUpgrade = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/battlepass/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        soundEngine.playVictory();
        setMessage("Chúc mừng! Bạn đã mở khóa Thẻ Chiến Giới Hoàng Kim!");
        fetchBattlePass();
      } else {
        soundEngine.playWrong();
        setMessage(data.message);
      }
    } catch (err: any) {
      soundEngine.playWrong();
      setMessage(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse text-sm">Đang tải Thẻ Chiến Giới...</div>
      </div>
    );
  }

  const pass = passData?.pass;
  const userProgress = passData?.userProgress;
  const tiers = passData?.tiers || [];

  const isPremium = userProgress?.isPremiumPurchased;
  const currentTier = userProgress?.currentTier || 1;
  const claimedFree = (userProgress?.claimedFreeTiers as number[]) || [];
  const claimedPremium = (userProgress?.claimedPremiumTiers as number[]) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-indigo-500/30 p-6 sm:p-10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              MÙA 1: KHỞI NGUYÊN LINH GIỚI
            </div>
            <h1 className="text-3xl font-black text-white">Thẻ Chiến Giới (Battle Pass)</h1>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Tích lũy kinh nghiệm qua các trận đấu để nâng cấp cấp độ và nhận hàng chục phần thưởng hoàng kim độc quyền.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl text-slate-300 font-bold border border-slate-700">
                Cấp hiện tại: <strong className="text-amber-400 text-sm">Cấp {currentTier}</strong>
              </span>
              {isPremium && (
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Thẻ Hoàng Kim Đã Kích Hoạt
                </span>
              )}
            </div>
          </div>

          {!isPremium && (
            <div className="bg-slate-900/90 border border-amber-500/40 p-5 rounded-3xl text-center space-y-3 shadow-xl max-w-xs w-full">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="font-black text-sm text-white">Thẻ Hoàng Kim (Premium)</div>
                <div className="text-xs text-slate-400">Mở khóa toàn bộ 20 phần thưởng quý hiếm</div>
              </div>
              <button
                type="button"
                onClick={handleUpgrade}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
              >
                <Coins className="w-4 h-4" /> Mở Khóa: 800 Xu
              </button>
            </div>
          )}
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/40 text-sm text-center text-indigo-200">
            {message}
          </div>
        )}

        {/* Tiers Road Map */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider mb-2">
            Lộ Trình Cấp Độ (20 Tầng Thử Thách)
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {tiers.map((tier: any) => {
              const isUnlocked = currentTier >= tier.tier;
              const hasClaimedFree = claimedFree.includes(tier.tier);
              const hasClaimedPremium = claimedPremium.includes(tier.tier);

              return (
                <div
                  key={tier.tier}
                  className={`p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isUnlocked
                      ? 'bg-slate-950/80 border-slate-700/80'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-65'
                  }`}
                >
                  {/* Tier Number Indicator */}
                  <div className="flex items-center gap-3 w-32">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                      isUnlocked
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {tier.tier}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-300">Cấp {tier.tier}</div>
                      <div className="text-[10px] text-slate-500">{tier.xpRequired} Tu Vi</div>
                    </div>
                  </div>

                  {/* Free Reward Track */}
                  <div className="flex-1 flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Miễn Phí</div>
                      <div className="text-xs font-semibold text-slate-200">{tier.freeReward.name}</div>
                    </div>
                    <div>
                      {hasClaimedFree ? (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đã nhận
                        </span>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(tier.tier, false)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                        >
                          Nhận
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Khóa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Premium Reward Track */}
                  <div className="flex-1 flex items-center justify-between bg-amber-950/10 border border-amber-500/20 p-3 rounded-xl">
                    <div>
                      <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Hoàng Kim
                      </div>
                      <div className="text-xs font-semibold text-amber-200">{tier.premiumReward.name}</div>
                    </div>
                    <div>
                      {hasClaimedPremium ? (
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Đã nhận
                        </span>
                      ) : isUnlocked && isPremium ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(tier.tier, true)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow transition"
                        >
                          Nhận
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {isPremium ? 'Khóa' : 'Cần VIP'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
