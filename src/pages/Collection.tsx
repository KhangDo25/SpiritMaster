import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Collection() {
  const [collections, setCollections] = useState<Record<string, { total: number, unlocked: number, items: any[] }>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('Spirits');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch('/api/collection');
        const data = await res.json();
        if (data.success) {
          setCollections(data.data);
          const cats = Object.keys(data.data);
          if (cats.length > 0 && !cats.includes('Spirits')) {
            setSelectedCategory(cats[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCollection();
  }, []);

  if (isLoading) return <div className="text-white p-8">Loading...</div>;

  const categories = Object.keys(collections);
  const currentCollection = collections[selectedCategory] || { items: [], total: 0, unlocked: 0 };

  return (
    <div className="min-h-screen bg-game-bg p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-game-primary uppercase tracking-widest mb-8">Mystery Collection</h1>
        
        {/* Category Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Button 
              key={cat} 
              variant={selectedCategory === cat ? 'primary' : 'secondary'}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat} ({collections[cat].unlocked}/{collections[cat].total})
            </Button>
          ))}
        </div>

        {/* Collection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentCollection.items.map(item => (
            <Card key={item.id} className={`p-6 ${item.isUnlocked ? 'border-purple-500 bg-gray-900' : 'border-gray-800 bg-gray-900/50 grayscale'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xl font-bold ${item.isUnlocked ? 'text-white' : 'text-gray-500'} uppercase`}>
                  {item.canonicalName}
                </h3>
                <span className={`text-xs px-2 py-1 rounded font-bold ${item.difficulty === 'HARD' ? 'bg-red-900/50 text-red-400' : item.difficulty === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-green-900/50 text-green-400'}`}>
                  {item.difficulty}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-400">
                <p><span className="font-bold text-purple-400">Hint 1:</span> {item.hint1}</p>
                <p><span className="font-bold text-purple-400">Hint 2:</span> {item.hint2}</p>
                <p><span className="font-bold text-purple-400">Hint 3:</span> {item.hint3}</p>
              </div>

              {!item.isUnlocked && (
                <div className="mt-4 text-center text-xs text-gray-600 font-bold uppercase tracking-widest">
                  Undiscovered
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
