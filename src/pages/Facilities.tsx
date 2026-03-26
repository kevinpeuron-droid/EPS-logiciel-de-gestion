import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Map, Plus, CalendarX, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function Facilities() {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [unavailableSlots, setUnavailableSlots] = useState<any[]>([]);
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newSlot, setNewSlot] = useState({
    facilityId: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const qFac = query(
      collection(db, 'facilities'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubFac = onSnapshot(qFac, (snapshot) => {
      setFacilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qSlots = query(
      collection(db, 'facilityUnavailableSlots'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubSlots = onSnapshot(qSlots, (snapshot) => {
      setUnavailableSlots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubFac();
      unsubSlots();
    };
  }, []);

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'facilities'), {
        name: newFacilityName,
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingFacility(false);
      setNewFacilityName('');
    } catch (error) {
      console.error('Error adding facility:', error);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'facilityUnavailableSlots'), {
        ...newSlot,
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingSlot(false);
      setNewSlot({ facilityId: '', startTime: '', endTime: '', reason: '' });
    } catch (error) {
      console.error('Error adding slot:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">Installations</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddingFacility(!isAddingFacility)}
            className="bg-primary-100 text-primary-700 p-3 rounded-full shadow-sm hover:bg-primary-200 transition-colors active:scale-95"
            title="Ajouter une installation"
          >
            <Map className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsAddingSlot(!isAddingSlot)}
            className="bg-red-100 text-red-700 p-3 rounded-full shadow-sm hover:bg-red-200 transition-colors active:scale-95"
            title="Signaler une indisponibilité"
          >
            <CalendarX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isAddingFacility && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold mb-4 text-zinc-800 font-display">Ajouter une installation</h3>
          <form onSubmit={handleAddFacility} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nom de l'installation</label>
              <input
                type="text"
                required
                className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={newFacilityName}
                onChange={(e) => setNewFacilityName(e.target.value)}
                placeholder="Ex: Gymnase Municipal, Stade d'Athlétisme"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAddingFacility(false)}
                className="px-5 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {isAddingSlot && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold mb-4 text-red-800 flex items-center gap-2 font-display">
            <CalendarX className="w-6 h-6" /> Signaler une indisponibilité
          </h3>
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Installation</label>
              <select
                required
                className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={newSlot.facilityId}
                onChange={(e) => setNewSlot({ ...newSlot, facilityId: e.target.value })}
              >
                <option value="">Sélectionner...</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Début</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={newSlot.startTime}
                  onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Fin</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Motif</label>
              <input
                type="text"
                className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={newSlot.reason}
                onChange={(e) => setNewSlot({ ...newSlot, reason: e.target.value })}
                placeholder="Ex: Travaux, Réquisition mairie"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAddingSlot(false)}
                className="px-5 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                Confirmer
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {facilities.map(facility => {
          const facilitySlots = unavailableSlots.filter(s => s.facilityId === facility.id);
          
          return (
            <div key={facility.id} className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="p-6 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-3 font-display">
                  <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
                    <Map className="w-5 h-5" />
                  </div>
                  {facility.name}
                </h3>
              </div>
              <div className="p-6">
                {facilitySlots.length > 0 ? (
                  <ul className="space-y-4">
                    {facilitySlots.map(slot => (
                      <li key={slot.id} className="flex items-start gap-4 p-4 bg-red-50/80 border border-red-100 rounded-2xl">
                        <CalendarX className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-900">Indisponible</p>
                          <div className="text-xs text-red-700 mt-1.5 flex flex-col gap-1.5 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Du {format(new Date(slot.startTime), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Au {format(new Date(slot.endTime), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </span>
                          </div>
                          {slot.reason && (
                            <p className="text-xs text-red-600 mt-2.5 italic">Motif: {slot.reason}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 italic flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                    Aucune indisponibilité prévue
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {facilities.length === 0 && !isAddingFacility && (
          <div className="text-center py-16 text-zinc-500 bg-white rounded-3xl border border-zinc-200 border-dashed">
            <Map className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
            <p className="text-xl font-bold font-display text-zinc-700">Aucune installation configurée</p>
            <p className="text-sm mt-2 font-medium">Ajoutez vos lieux de pratique sportive.</p>
          </div>
        )}
      </div>
    </div>
  );
}
