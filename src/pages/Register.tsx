import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { setAuthToken } from '../utils/auth';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanDisplay = displayName.trim() || cleanUsername;
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự (gồm chữ và số).');
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password, confirmPassword, displayName: cleanDisplay })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        if (data.data?.token) {
          setAuthToken(data.data.token);
        }
        navigate('/dashboard');
      } else {
        // Handle validation array or plain message
        const msg = data?.data && Array.isArray(data.data)
          ? data.data.map((x: any) => x.message).join(', ')
          : data?.message || 'Registration failed';
        if (response.status === 409 || /already exists/i.test(msg)) {
          setError('Tài khoản hoặc email đã tồn tại. Vui lòng chọn thông tin khác.');
        } else if (response.status === 503) {
          setError('Máy chủ xác thực chưa sẵn sàng. Vui lòng thử lại sau.');
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      setError('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-game-primary text-center uppercase tracking-widest mb-6">Forge a Spirit</h2>
        
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-game-text-muted mb-1 uppercase tracking-wide">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-game-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-game-text-muted mb-1 uppercase tracking-wide">Display Name</label>
            <input 
              type="text" 
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-game-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-game-text-muted mb-1 uppercase tracking-wide">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-game-primary transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-game-text-muted mb-1 uppercase tracking-wide">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-game-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-game-text-muted mb-1 uppercase tracking-wide">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-game-primary transition-colors"
            />
          </div>

          <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
            Manifest
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-game-text-muted">
          Already forged? <Link to="/login" className="text-game-primary hover:underline">Login here</Link>
        </div>
      </Card>
    </div>
  );
}
