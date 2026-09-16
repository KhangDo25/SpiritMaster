import React, { useState, useEffect } from 'react';
import { ShoppingBag, Coins, Check, Sparkles, Shirt, Sparkle, Smile, Frame, Image } from 'lucide-react';
import { soundEngine } from '../utils/audio';
import { getAuthToken } from '../utils/auth';

export default function Shop() {
  const [coins, setCoins] = useState(0);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchShop();
  }, []);

  const fetchShop = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/shop/cosmetics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCoins(data.data.coins);
        setCatalog(data.data.catalog || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: any) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cosmeticId: item.id })
      });
      const data = await res.json();
      if (data.success) {
        soundEngine.playCoin();
        setMessage(`Đã mua thành công ${item.name}!`);
        fetchShop();
      } else {
        soundEngine.playWrong();
        setMessage(data.message || 'Giao dịch thất bại');
      }
    } catch (err: any) {
      soundEngine.playWrong();
      setMessage(err.message);
    }
  };

  const handleToggleEquip = async (item: any) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cosmeticId: item.id, shouldEquip: !item.isEquipped })
      });
      const data = await res.json();
      if (data.success) {
        soundEngine.playClick();
        fetchShop();
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'Tất Cả' },
    { id: 'SPIRIT_SKIN', label: 'Trang Phục Linh Thú' },
    { id: 'RUNNER_TRAIL', label: 'Hiệu Ứng Vệt Sáng' },
    { id: 'EMOTE', label: 'Biểu Cảm Động' },
    { id: 'AVATAR_FRAME', label: 'Khung Đại Diện' },
    { id: 'PROFILE_BG', label: 'Hình Nền Hồ Sơ' }
  ];

  const filtered = activeTab === 'ALL' ? catalog : catalog.filter(c => c.type === activeTab);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header HUD */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wider">Thương Điếm Linh Giới</h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Sở hữu trang phục, vệt sáng ma pháp và khung chân dung độc bản
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
            <Coins className="w-5 h-5 text-amber-400" />
            <div className="text-xl font-black text-amber-400 font-mono">{coins.toLocaleString()} Xu</div>
          </div>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-indigo-900/40 border border-indigo-500/40 text-sm text-center text-indigo-200">
            {message}
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTab(tab.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse text-sm">
            Đang tải kho bảo vật...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map(item => {
              const isLegendary = item.rarity === 'LEGENDARY';
              const isEpic = item.rarity === 'EPIC';

              return (
                <div
                  key={item.id}
                  className={`bg-slate-900 rounded-3xl border p-5 flex flex-col justify-between transition-all hover:scale-[1.02] shadow-xl ${
                    item.isEquipped
                      ? 'border-emerald-500/60 shadow-emerald-500/10'
                      : isLegendary
                      ? 'border-amber-500/50'
                      : isEpic
                      ? 'border-purple-500/40'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Item preview badge / icon */}
                    <div className="h-36 rounded-2xl bg-slate-950 flex flex-col items-center justify-center p-4 mb-4 border border-slate-800 relative overflow-hidden">
                      <div className="text-4xl mb-2">
                        {item.type === 'SPIRIT_SKIN' && '👘'}
                        {item.type === 'RUNNER_TRAIL' && '✨'}
                        {item.type === 'EMOTE' && '😎'}
                        {item.type === 'AVATAR_FRAME' && '🖼️'}
                        {item.type === 'PROFILE_BG' && '🌌'}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        isLegendary
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isEpic
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {item.rarity}
                      </span>

                      {item.isEquipped && (
                        <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 p-1 rounded-full text-xs font-black shadow">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-slate-200 mb-1">{item.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400 font-black text-sm">
                      <Coins className="w-4 h-4" />
                      <span>{item.priceCoins.toLocaleString()} Xu</span>
                    </div>

                    {item.isOwned ? (
                      <button
                        type="button"
                        onClick={() => handleToggleEquip(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          item.isEquipped
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                        }`}
                      >
                        {item.isEquipped ? 'Đang Sử Dụng' : 'Trang Bị'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuy(item)}
                        disabled={coins < item.priceCoins}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 shadow-md shadow-amber-500/20 transition"
                      >
                        Mua Ngay
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
