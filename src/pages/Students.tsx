import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { StudentHealthBadge } from '../components/StudentHealthBadge';
import { CsvImportWizard } from '../components/CsvImportWizard';
import { Users, Plus, UserPlus, Search, Upload, Folder, Calendar, ChevronLeft, Settings } from 'lucide-react';

interface ClassSchedule {
  dayOfWeek: string;
  apsa: string;
}

export function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingScheduleClass, setEditingScheduleClass] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ClassSchedule[]>([]);

  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    healthAlerts: '' as string,
    dispensationEnd: ''
  });

  const [newClassName, setNewClassName] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Fetch students
    const qStudents = query(collection(db, 'students'), where('teacherId', '==', auth.currentUser.uid));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch classGroups
    const qClasses = query(collection(db, 'classGroups'), where('teacherId', '==', auth.currentUser.uid));
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      setClassGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch sports
    const qSports = query(collection(db, 'sports'), where('teacherId', '==', auth.currentUser.uid));
    const unsubSports = onSnapshot(qSports, (snapshot) => {
      setSports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubClasses();
      unsubSports();
    };
  }, []);

  // Compute all unique classes
  const allClasses = Array.from(new Set([
    ...students.map(s => s.classGroupId),
    ...classGroups.map(c => c.name)
  ])).sort();

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !selectedClass) return;

    try {
      const studentData: any = {
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        classGroupId: selectedClass,
        healthAlerts: newStudent.healthAlerts ? newStudent.healthAlerts.split(',').map(s => s.trim()) : [],
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };

      if (newStudent.dispensationEnd) {
        studentData.dispensationEnd = newStudent.dispensationEnd;
      }

      await addDoc(collection(db, 'students'), studentData);
      setIsAddingStudent(false);
      setNewStudent({ firstName: '', lastName: '', healthAlerts: '', dispensationEnd: '' });
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newClassName.trim()) return;
    try {
      await addDoc(collection(db, 'classGroups'), {
        name: newClassName.trim(),
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsAddingClass(false);
      setNewClassName('');
    } catch (error) {
      console.error('Error adding class:', error);
    }
  };

  const openScheduleModal = (className: string) => {
    const classGroup = classGroups.find(c => c.name === className);
    if (classGroup && classGroup.scheduleJson) {
      try {
        setScheduleForm(JSON.parse(classGroup.scheduleJson));
      } catch (e) {
        setScheduleForm([]);
      }
    } else {
      setScheduleForm([]);
    }
    setEditingScheduleClass(className);
  };

  const saveSchedule = async () => {
    if (!auth.currentUser || !editingScheduleClass) return;
    try {
      const classGroup = classGroups.find(c => c.name === editingScheduleClass);
      const scheduleJson = JSON.stringify(scheduleForm);
      
      if (classGroup) {
        // Update existing
        await setDoc(doc(db, 'classGroups', classGroup.id), { scheduleJson }, { merge: true });
      } else {
        // Create new
        await addDoc(collection(db, 'classGroups'), {
          name: editingScheduleClass,
          scheduleJson,
          teacherId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      setEditingScheduleClass(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const addScheduleItem = () => {
    setScheduleForm([...scheduleForm, { dayOfWeek: 'Lundi', apsa: sports[0]?.name || '' }]);
  };

  const updateScheduleItem = (index: number, field: keyof ClassSchedule, value: string) => {
    const newSchedule = [...scheduleForm];
    newSchedule[index][field] = value;
    setScheduleForm(newSchedule);
  };

  const removeScheduleItem = (index: number) => {
    setScheduleForm(scheduleForm.filter((_, i) => i !== index));
  };

  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  if (selectedClass) {
    const classStudents = students.filter(s => s.classGroupId === selectedClass);
    const filteredStudents = classStudents.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedClass(null)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Classe : {selectedClass}
          </h2>
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => { setIsImportingCsv(!isImportingCsv); setIsAddingStudent(false); }}
              className="bg-white text-slate-700 border border-slate-200 p-3 rounded-full shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
              title="Importer depuis un CSV"
            >
              <Upload className="w-6 h-6" />
            </button>
            <button
              onClick={() => { setIsAddingStudent(!isAddingStudent); setIsImportingCsv(false); }}
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

        {isAddingStudent && (
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
                  onClick={() => setIsAddingStudent(false)}
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
            {filteredStudents.length === 0 && !isAddingStudent && (
              <li className="p-8 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-lg font-medium">Aucun élève trouvé dans cette classe</p>
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  // Class Grid View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dossiers des Classes</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddingClass(!isAddingClass)}
            className="bg-indigo-600 text-white p-3 rounded-full shadow-md hover:bg-indigo-700 transition-colors active:scale-95"
            title="Ajouter une classe"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {isAddingClass && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Nouvelle Classe</h3>
          <form onSubmit={handleAddClass} className="flex gap-4">
            <input
              type="text"
              required
              className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Nom de la classe (ex: 6A)"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Créer
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allClasses.map(className => {
          const classStudents = students.filter(s => s.classGroupId === className);
          const classGroup = classGroups.find(c => c.name === className);
          let schedule: ClassSchedule[] = [];
          if (classGroup?.scheduleJson) {
            try { schedule = JSON.parse(classGroup.scheduleJson); } catch (e) {}
          }

          return (
            <div key={className} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{className}</h3>
                    <p className="text-sm text-slate-500">{classStudents.length} élèves</p>
                  </div>
                </div>
                <button 
                  onClick={() => openScheduleModal(className)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Gérer l'emploi du temps"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 bg-slate-50/50">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Emploi du temps</h4>
                {schedule.length > 0 ? (
                  <ul className="space-y-2">
                    {schedule.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{item.dayOfWeek}</span>
                        <span className="text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200">{item.apsa}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">Aucun emploi du temps défini</p>
                )}
              </div>

              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedClass(className)}
                  className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  Ouvrir le dossier
                </button>
              </div>
            </div>
          );
        })}
        {allClasses.length === 0 && !isAddingClass && (
          <div className="col-span-full p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            <Folder className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-medium">Aucune classe trouvée</p>
            <p className="text-sm mt-1">Ajoutez une classe ou importez des élèves pour commencer.</p>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {editingScheduleClass && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Emploi du temps - {editingScheduleClass}</h3>
              <button onClick={() => setEditingScheduleClass(null)} className="text-slate-400 hover:text-slate-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {scheduleForm.map((item, index) => (
                <div key={index} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <select
                    value={item.dayOfWeek}
                    onChange={(e) => updateScheduleItem(index, 'dayOfWeek', e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={item.apsa}
                    onChange={(e) => updateScheduleItem(index, 'apsa', e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Sélectionner un sport...</option>
                    {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <button
                    onClick={() => removeScheduleItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                onClick={addScheduleItem}
                className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter un créneau
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingScheduleClass(null)}
                className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveSchedule}
                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
