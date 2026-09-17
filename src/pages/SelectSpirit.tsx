import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { setAuthToken } from '../utils/auth';
import { motion, AnimatePresence } from 'motion/react';

// Maps realms to specific colors and symbols
const realmStyles: Record<string, { bg: string; text: string; label: string; desc: string }> = {
  'Hỏa': { bg: 'from-red-900/40 to-red-600/20', text: 'text-red-400', label: 'Fire', desc: 'Aggressive power and destruction.' },
  'Thủy': { bg: 'from-blue-900/40 to-blue-600/20', text: 'text-blue-400', label: 'Water', desc: 'Flowing grace and healing.' },
  'Mộc': { bg: 'from-green-900/40 to-green-600/20', text: 'text-green-400', label: 'Wood', desc: 'Growth, roots, and resilience.' },
  'Lôi': { bg: 'from-yellow-900/40 to-yellow-600/20', text: 'text-yellow-400', label: 'Thunder', desc: 'Speed and striking fury.' },
  'Ảnh': { bg: 'from-purple-900/40 to-purple-600/20', text: 'text-purple-400', label: 'Shadow', desc: 'Stealth and evasion.' },
  'Quang': { bg: 'from-orange-900/40 to-yellow-200/20', text: 'text-amber-400', label: 'Light', desc: 'Purity and blinding radiance.' },
};

export default function SelectSpirit() {
  const [spirits, setSpirits] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSummoning, setIsSummoning] = useState(false);
  const [error, setError] = useState('');
  
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.hasStarter) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const fetchStarters = async () => {
      try {
        const res = await fetch('/api/spirits/starters');
        const data = await res.json();
        if (data.success) {
          setSpirits(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStarters();
  }, [user, navigate]);

  const handleSummon = async () => {
  if (!selectedId) return;
  setIsSummoning(true);
  setError('');

  try {
    const res = await fetch('/api/spirits/select-starter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spiritId: selectedId })
    });

    const data = await res.json();

    if (data.success) {
      if (data.data?.token) {
        setAuthToken(data.data.token);
      }

      setTimeout(async () => {
        await checkAuth();
        navigate('/dashboard');
      }, 3000);
    } else {
      setError(data.message || 'Failed to summon');
      setIsSummoning(false);
    }
  } catch (err) {
    setError('An error occurred during summoning.');
    setIsSummoning(false);
  }
};

  const selectedSpirit = spirits.find(s => s.id === selectedId);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-30">
        <div className="w-[800px] h-[800px] bg-game-primary rounded-full blur-[150px] mix-blend-screen opacity-20" />
      </div>

      <div className="z-10 text-center mb-12">
        <h1 className="text-4xl font-bold text-white uppercase tracking-[0.2em] mb-4">Choose Your Path</h1>
        <p className="text-game-text-muted max-w-xl mx-auto">
          Six realms bind the world. Before your journey begins, you must form a pact with a starting spirit. Choose wisely.
        </p>
        {error && <p className="text-red-400 mt-4 bg-red-900/50 inline-block px-4 py-2 rounded">{error}</p>}
      </div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
        {spirits.map((spirit) => {
          const style = realmStyles[spirit.realm] || { bg: 'bg-gray-800', text: 'text-white', label: spirit.realm, desc: 'Unknown entity.' };
          const isSelected = selectedId === spirit.id;
          
          return (
            <motion.div 
              key={spirit.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isSummoning && setSelectedId(spirit.id)}
            >
              <Card className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${isSelected ? 'ring-2 ring-game-primary scale-105' : 'hover:border-gray-500'}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-20`} />
                <div className="relative z-10 p-6 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full border-2 border-current ${style.text} flex items-center justify-center mb-4 text-2xl font-bold`}>
                    {spirit.realm[0]}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-widest">{spirit.name}</h3>
                  <div className={`text-sm font-semibold uppercase tracking-wider mb-3 ${style.text}`}>
                    Realm: {style.label}
                  </div>
                  <p className="text-sm text-game-text-muted">{style.desc}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="z-10 mt-12">
        <Button 
          variant="primary" 
          size="lg" 
          className="px-16"
          disabled={!selectedId || isSummoning}
          onClick={handleSummon}
        >
          {isSummoning ? 'Summoning...' : 'Form Pact'}
        </Button>
      </div>

      {/* Summoning Fullscreen Animation Overlay */}
      <AnimatePresence>
        {isSummoning && selectedSpirit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.2, 1],
                opacity: [0, 1, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className={`w-32 h-32 rounded-full border-4 border-current ${realmStyles[selectedSpirit.realm]?.text || 'text-white'} flex items-center justify-center text-4xl mb-8`}
            >
              {selectedSpirit.realm[0]}
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="text-3xl font-bold text-white uppercase tracking-[0.2em]"
            >
              {selectedSpirit.name} answers your call.
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
