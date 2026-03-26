import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Activity, Plus, Trash2 } from 'lucide-react';

export function Sports() {
  const [sports, setSports] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSportName, setNewSportName] = useState('');

  const [sportToDelete, setSportToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'sports'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort alphabetically
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSports(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newSportName.trim()) return;

    try {
      const sportsToAdd = newSportName.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      
      const promises = sportsToAdd.map(sportName => 
        addDoc(collection(db, 'sports'), {
          name: sportName,
          teacherId: auth.currentUser!.uid,
          createdAt: serverTimestamp()
        })
      );

      await Promise.all(promises);
      setIsAdding(false);
      setNewSportName('');
    } catch (error) {
      console.error('Error adding sport:', error);
    }
  };

  const handleDeleteSport = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sports', id));
      setSportToDelete(null);
    } catch (error) {
      console.error('Error deleting sport:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">Sports (APSA)</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary-600 text-white p-3 rounded-full shadow-md hover:bg-primary-700 transition-colors active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {sportToDelete && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border border-white/50">
            <h3 className="text-xl font-bold text-zinc-900 mb-3 font-display">Supprimer ce sport ?</h3>
            <p className="text-zinc-600 mb-8 font-medium">Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSportToDelete(null)}
                className="px-5 py-2.5 text-zinc-600 font-bold hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteSport(sportToDelete)}
                className="px-5 py-2.5 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-colors shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold mb-4 text-zinc-800 font-display">Nouveau Sport</h3>
          <form onSubmit={handleAddSport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nom du sport (ou plusieurs séparés par des virgules)</label>
              <textarea
                required
                className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={newSportName}
                onChange={(e) => setNewSportName(e.target.value)}
                placeholder="Ex: Basket-ball, Gymnastique, Natation..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-5 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
              >
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
        <ul className="divide-y divide-zinc-100">
          {sports.map((sport) => (
            <li key={sport.id} className="p-5 hover:bg-zinc-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shadow-sm border border-primary-100">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="text-lg font-semibold text-zinc-900">
                  {sport.name}
                </p>
              </div>
              <button
                onClick={() => setSportToDelete(sport.id)}
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
          {sports.length === 0 && !isAdding && (
            <li className="p-10 text-center text-zinc-500">
              <Activity className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
              <p className="text-lg font-medium">Aucun sport configuré</p>
              <p className="text-sm mt-1">Ajoutez vos APSA pour les utiliser dans vos séances.</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
