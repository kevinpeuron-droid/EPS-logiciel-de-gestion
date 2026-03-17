import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { StudentHealthBadge } from '../components/StudentHealthBadge';
import { CsvImportWizard } from '../components/CsvImportWizard';
import { Users, Plus, UserPlus, Search, Upload } from 'lucide-react';

export function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    classGroupId: '6A',
    healthAlerts: '' as string,
    dispensationEnd: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'students'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'students'), {
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        classGroupId: newStudent.classGroupId,
        healthAlerts: newStudent.healthAlerts ? newStudent.healthAlerts.split(',').map(s => s.trim()) : [],
        dispensationEnd: newStudent.dispensationEnd || null,
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewStudent({ firstName: '', lastName: '', classGroupId: '6A', healthAlerts: '', dispensationEnd: '' });
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Élèves</h2>
        <div className="flex gap-3">
          <button
            onClick={() => { setIsImportingCsv(!isImportingCsv); setIsAdding(false); }}
            className="bg-white text-slate-700 border border-slate-200 p-3 rounded-full shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
            title="Importer depuis un CSV"
          >
            <Upload className="w-6 h-6" />
          </button>
          <button
            onClick={() => { setIsAdding(!isAdding); setIsImportingCsv(false); }}
            className="bg-indigo-600 text-white p-3 rounded-full shadow-md hover:bg-indigo-700 transition-colors active:scale-95"
            title="Ajouter un élève manuellement"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un élève..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {isImportingCsv && (
        <CsvImportWizard 
          onComplete={() => setIsImportingCsv(false)} 
          onCancel={() => setIsImportingCsv(false)} 
        />
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Nouvel Élève</h3>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alertes Santé (séparées par des virgules)</label>
              <input
                type="text"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newStudent.healthAlerts}
                onChange={(e) => setNewStudent({ ...newStudent, healthAlerts: e.target.value })}
                placeholder="Ex: Asthme, PAI, Allergie arachide"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin de dispense (optionnel)</label>
              <input
                type="date"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={newStudent.dispensationEnd}
                onChange={(e) => setNewStudent({ ...newStudent, dispensationEnd: e.target.value })}
              />
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
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {filteredStudents.map((student) => (
            <li key={student.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Classe: {student.classGroupId}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <StudentHealthBadge 
                  alerts={student.healthAlerts} 
                  dispensationEnd={student.dispensationEnd} 
                />
              </div>
            </li>
          ))}
          {filteredStudents.length === 0 && !isAdding && (
            <li className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-lg font-medium">Aucun élève trouvé</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
