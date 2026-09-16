import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { getAuthToken } from '../utils/auth';
import { soundEngine } from '../utils/audio';
import { LogIn, ArrowLeft } from 'lucide-react';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim() || code.length < 4) return;
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
        body: JSON.stringify({ code: code.toUpperCase().trim() })
      });
      const data = await res.json();
      
      if (data.success && data.data?.roomId) {
        soundEngine.playVictory();
        navigate(`/multiplayer/lobby/${data.data.roomId}`);
      } else {
        soundEngine.playWrong();
        alert(data.message || 'Mã phòng không hợp lệ hoặc đã đầy');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ khi tham gia phòng');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Đấu Trường</span>
          <div className="w-9" />
        </div>

        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-lg">
          <LogIn className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-wider font-serif mb-1">
          Tham Gia Phòng Đấu
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Nhập mã phòng 5 ký tự được chia sẻ từ chủ phòng.
        </p>
        
        <div className="space-y-5">
          <input 
            type="text" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="K9X27"
            className="w-full bg-slate-950 border-2 border-slate-700 text-amber-300 rounded-2xl p-4 text-center text-3xl font-mono tracking-[0.4em] focus:outline-none focus:border-amber-400 uppercase shadow-inner"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />

          <div className="flex gap-3">
            <button 
              type="button"
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition disabled:opacity-50" 
              onClick={handleJoin} 
              disabled={isJoining || code.length < 4}
            >
              {isJoining ? 'Đang Gia Nhập...' : 'Vào Phòng Ngay'}
            </button>
            <button 
              type="button"
              className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition" 
              onClick={() => navigate('/dashboard')}
            >
              Hủy
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
