import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FileUpload } from '../components/FileUpload';
import { Plus, FileText, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    date: '',
    apsa: '',
    classGroupId: '6A', // Mock class
    pdfUrls: [] as string[]
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'sessions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'sessions'), {
        ...newSession,
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewSession({ title: '', date: '', apsa: '', classGroupId: '6A', pdfUrls: [] });
    } catch (error) {
      console.error('Error adding session:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mes Séances</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 text-white p-3 rounded-full shadow-md hover:bg-indigo-700 transition-colors active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Nouvelle Séance</h3>
          <form onSubmit={handleAddSession} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la séance</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                placeholder="Ex: Séance 1 - Évaluation diagnostique"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newSession.date}
                  onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">APSA</label>
                <select
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newSession.apsa}
                  onChange={(e) => setNewSession({ ...newSession, apsa: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  <option value="Acrosport">Acrosport</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Demi-fond">Demi-fond</option>
                  <option value="Natation">Natation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fiche Séance (PDF)</label>
              <FileUpload
                onUploadComplete={(url, name) => {
                  setNewSession(prev => ({ ...prev, pdfUrls: [...prev.pdfUrls, url] }));
                }}
              />
              {newSession.pdfUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {newSession.pdfUrls.map((url, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                      <FileText className="w-4 h-4 mr-2" />
                      PDF {i + 1}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="inline-block px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider rounded-md mb-2">
                  {session.apsa}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{session.title}</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1.5" />
                {session.date ? format(new Date(session.date), 'dd MMM yyyy', { locale: fr }) : 'Date non définie'}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1.5" />
                {session.date ? format(new Date(session.date), 'HH:mm') : '--:--'}
              </div>
            </div>

            {session.pdfUrls && session.pdfUrls.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                {session.pdfUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                    Ouvrir PDF
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {sessions.length === 0 && !isAdding && (
          <div className="text-center py-12 text-slate-500">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-medium">Aucune séance prévue</p>
            <p className="text-sm">Appuyez sur le bouton + pour créer votre première séance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
