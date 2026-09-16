import React, { useState, useEffect } from 'react';
import { Calendar, Sparkles, CheckCircle, Clock, Gift, Flame } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';

export default function Events() {
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/events/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEventData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (questId: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/events/claim/${questId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        soundEngine.playVictory();
        setClaimMessage("Đã nhận thành công 100 Xu thưởng sự kiện!");
        fetchEvent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse text-sm">Đang tải sự kiện theo mùa...</div>
      </div>
    );
  }

  const event = eventData?.event;
  const quests = eventData?.quests || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Seasonal Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 p-8 sm:p-12 bg-gradient-to-br from-amber-950/60 via-slate-900 to-indigo-950/60 shadow-2xl">
          <div className="relative z-10 space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              SỰ KIỆN MÙA ĐANG DIỄN RA
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-wide text-white">
              {event?.name || 'Linh Thú Giáng Trần: Mùa 1'}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              {event?.description || 'Tham gia hoàn thành các nhiệm vụ đặc biệt mùa hè để tích lũy Linh Thạch và nhận thưởng danh hiệu quý hiếm.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold pt-2">
              <Clock className="w-4 h-4" />
              <span>Thời gian còn lại: 18 ngày 12 giờ</span>
            </div>
          </div>
        </div>

        {/* Quest claim status message */}
        {claimMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-sm text-center text-emerald-300">
            {claimMessage}
          </div>
        )}

        {/* Seasonal Quests */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-200">Nhiệm Vụ Mùa</h2>
            </div>
            <span className="text-xs text-slate-400">Tự động làm mới mỗi tuần</span>
          </div>

          <div className="space-y-4">
            {quests.map((quest: any) => {
              const isCompleted = quest.progress >= quest.maxProgress;
              const progressPct = Math.min(100, (quest.progress / quest.maxProgress) * 100);

              return (
                <div
                  key={quest.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-200">{quest.title}</span>
                      <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        +{quest.rewardCurrency} {quest.currencyName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{quest.description}</p>

                    {/* Progress bar */}
                    <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Tiến độ: {quest.progress}/{quest.maxProgress}
                    </div>
                  </div>

                  <div>
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(quest.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Nhận Thưởng
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl inline-block">
                        Đang thực hiện
                      </span>
                    )}
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
