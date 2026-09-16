import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { soundEngine } from '../utils/audio';
import { setAuthToken } from '../utils/auth';
import { User, Key, Flame, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { checkAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login: login.trim(), username: login.trim(), password })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        if (data.data?.token) {
          setAuthToken(data.data.token);
        }
        soundEngine.playVictory();
        await checkAuth(); // refresh user state
        navigate('/dashboard');
      } else {
        soundEngine.playWrong();
        const msg = Array.isArray(data?.data)
          ? data.data.map((x: any) => x.message).join(', ')
          : data?.message;
        if (response.status === 503) {
          setError('Máy chủ xác thực chưa sẵn sàng. Vui lòng thử lại sau.');
        } else {
          setError(msg || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
        }
      }
    } catch (err) {
      soundEngine.playWrong();
      setError('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="w-full bg-slate-900 border-slate-800 shadow-2xl rounded-3xl p-6 sm:p-8">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Flame className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Linh Thú Hội</h2>
            <p className="text-xs text-slate-400">Đăng nhập để bước vào thế giới tu tiên kỳ bí</p>
          </div>
          
          {error && (
            <div className="bg-rose-950/60 border border-rose-500/50 text-rose-300 p-3 rounded-2xl mb-4 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" /> Tên Tài Khoản hoặc Email
              </label>
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Nhập username hoặc email của bạn"
                autoComplete="username"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Mật Khẩu (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pr-11 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-600/20" 
              isLoading={isLoading}
            >
              Đăng Nhập Ngay
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline">
              Đăng ký tài khoản mới
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
