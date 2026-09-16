import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MAPS } from '../game/maps';
import { getAuthToken } from '../utils/auth';
import { normalizeGameMode } from '../types/gameMode';
import { Paintbrush, Swords, Users, Shield, ArrowLeft, Zap, HelpCircle, Footprints, Shuffle } from 'lucide-react';

export default function CreateRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = normalizeGameMode(searchParams.get('mode') || 'DRAW_GUESS');
  const [mode, setMode] = useState<string>(initialMode);
  const [theme, setTheme] = useState('forest_1');
  const [maxRounds, setMaxRounds] = useState(3);
  const [roundTime, setRoundTime] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
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
          mode: normalizeGameMode(mode),
          theme,
          maxRounds,
          roundTimeSeconds: roundTime,
          maxPlayers: 12
        })
      });
      const data = await res.json();
      const roomId = data.data?.id || data.data?.roomId;
      if (data.success && roomId) {
        navigate(`/multiplayer/lobby/${roomId}`);
      } else {
        alert(data.message || 'Không thể tạo phòng đấu');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ khi tạo phòng');
    } finally {
      setIsCreating(false);
    }
  };

  const modes = [
    { id: 'DRAW_GUESS', label: 'Vẽ & Đoán', desc: 'Họa sĩ vẽ tranh, thần sứ cùng đoán từ khóa', icon: Paintbrush, color: 'border-rose-500 bg-rose-950/40 text-rose-300' },
    { id: 'DRAW_BATTLE', label: 'Vẽ Đối Kháng', desc: '2 họa sĩ thi tài vẽ cùng đề tài, bình chọn tác phẩm', icon: Swords, color: 'border-amber-500 bg-amber-950/40 text-amber-300' },
    { id: 'GUESS_RUSH', label: 'Đoán Cấp Tốc', desc: 'Gợi ý mở dần theo giây, ai phản xạ nhanh nhất giành điểm', icon: Zap, color: 'border-yellow-500 bg-yellow-950/40 text-yellow-300' },
    { id: 'BLUFF', label: 'Bẫy Lừa Bí Ẩn', desc: 'Tạo đáp án giả thuyết phục để lừa đối thủ bầu chọn', icon: HelpCircle, color: 'border-purple-500 bg-purple-950/40 text-purple-300' },
    { id: 'SPIRIT_RACE', label: 'Đua Linh Thú', desc: 'Điều khiển linh thú né bẫy nhặt xu chạy đua về đích', icon: Footprints, color: 'border-emerald-500 bg-emerald-950/40 text-emerald-300' },
    { id: 'RANDOM', label: 'Ngẫu Nhiên', desc: 'Hệ thống tự động xoay tua các chế độ mỗi vòng đấu', icon: Shuffle, color: 'border-cyan-500 bg-cyan-950/40 text-cyan-300' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-xl p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-amber-300 uppercase tracking-widest font-serif">
              Tạo Phòng Đấu Trường
            </h2>
            <p className="text-xs text-slate-400">Tùy chỉnh thể thức và luật thi đấu nhiều người</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Chọn Chế Độ */}
          <div>
            <label className="block text-slate-300 uppercase text-xs font-black tracking-wider mb-2.5">
              Chế Độ Thi Đấu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modes.map(m => {
                const Icon = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition ${
                      isSelected
                        ? `${m.color} ring-2 ring-amber-400/50 shadow-lg`
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-black text-white">{m.label}</div>
                      <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bản Đồ Theme */}
          <div>
            <label className="block text-slate-300 uppercase text-xs font-black tracking-wider mb-2">
              Linh Giới Thi Đấu
            </label>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 focus:outline-none focus:border-amber-400 text-sm font-semibold"
            >
              {Object.values(MAPS).map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>
          </div>

          {/* Số Vòng Đấu */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-300 uppercase text-xs font-black tracking-wider">
                Số Vòng Đấu
              </label>
              <span className="text-xs font-mono font-bold text-amber-400">{maxRounds} Vòng</span>
            </div>
            <input 
              type="range" 
              min="1" max="10" 
              value={maxRounds} 
              onChange={(e) => setMaxRounds(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 rounded-lg h-2"
            />
          </div>

          {/* Thời Gian Mỗi Lượt */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-300 uppercase text-xs font-black tracking-wider">
                Thời Gian Mỗi Vòng
              </label>
              <span className="text-xs font-mono font-bold text-amber-400">{roundTime} Giây</span>
            </div>
            <input 
              type="range" 
              min="30" max="180" step="15"
              value={roundTime} 
              onChange={(e) => setRoundTime(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 rounded-lg h-2"
            />
          </div>

          {/* Nút Tạo Phòng */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {isCreating ? 'Đang Khởi Tạo Phòng...' : 'Khởi Tạo Phòng Đấu'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
            >
              Hủy
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
