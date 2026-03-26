import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, doc, serverTimestamp, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { StudentHealthBadge } from '../components/StudentHealthBadge';
import { CsvImportWizard } from '../components/CsvImportWizard';
import { Users, Plus, UserPlus, Search, Upload, Folder, Calendar, ChevronLeft, Settings, Trash2 } from 'lucide-react';
import { formatFirstName, formatLastName } from '../lib/utils';

interface SchedulePeriod {
  startWeek: number;
  endWeek: number;
}

interface ClassSchedule {
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
  periods?: SchedulePeriod[];
  startDate?: string;
  endDate?: string;
  facilityId?: string;
  apsa: string;
  // Legacy fields for backward compatibility
  timeSlot?: string;
  period?: string;
  startWeek?: number;
  endWeek?: number;
}

const TIME_SLOTS = [
  "08:00 - 10:00", "10:00 - 12:00", "13:30 - 15:30", "15:30 - 17:30",
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "13:30 - 14:30", "14:30 - 15:30", "15:30 - 16:30", "16:30 - 17:30"
];

const PERIODS = [
  "Période 1", "Période 2", "Période 3", "Période 4", "Période 5",
  "Trimestre 1", "Trimestre 2", "Trimestre 3",
  "Semestre 1", "Semestre 2",
  "Toute l'année"
];

export function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  
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
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

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

    // Fetch facilities
    const qFacilities = query(collection(db, 'facilities'), where('teacherId', '==', auth.currentUser.uid));
    const unsubFacilities = onSnapshot(qFacilities, (snapshot) => {
      setFacilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubClasses();
      unsubSports();
      unsubFacilities();
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
        firstName: formatFirstName(newStudent.firstName),
        lastName: formatLastName(newStudent.lastName),
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

  const confirmDeleteClass = async () => {
    if (!classToDelete || !auth.currentUser) return;
    try {
      // Delete classGroup document
      const classGroup = classGroups.find(c => c.name === classToDelete);
      if (classGroup) {
        await deleteDoc(doc(db, 'classGroups', classGroup.id));
      }
      
      // Delete all students in this class
      const studentsToDelete = students.filter(s => s.classGroupId === classToDelete);
      const deletePromises = studentsToDelete.map(s => deleteDoc(doc(db, 'students', s.id)));
      await Promise.all(deletePromises);
      
      setClassToDelete(null);
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const openScheduleModal = (className: string) => {
    const classGroup = classGroups.find(c => c.name === className);
    if (classGroup && classGroup.scheduleJson) {
      try {
        const parsed = JSON.parse(classGroup.scheduleJson);
        const migrated = parsed.map((item: any) => {
          if (!item.periods) {
            if (item.startWeek && item.endWeek) {
              item.periods = [{ startWeek: item.startWeek, endWeek: item.endWeek }];
            } else {
              item.periods = [{ startWeek: 1, endWeek: 52 }];
            }
          }
          return item;
        });
        setScheduleForm(migrated);
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
    setScheduleForm([...scheduleForm, { 
      dayOfWeek: 'Lundi', 
      startTime: '08:00',
      endTime: '10:00',
      periods: [{ startWeek: 1, endWeek: 52 }],
      apsa: sports[0]?.name || '',
      facilityId: facilities[0]?.id || ''
    }]);
  };

  const updateScheduleItem = (index: number, field: keyof ClassSchedule, value: any) => {
    const newSchedule = [...scheduleForm];
    newSchedule[index][field] = value;
    setScheduleForm(newSchedule);
  };

  const addPeriodToItem = (index: number) => {
    const newSchedule = [...scheduleForm];
    if (!newSchedule[index].periods) newSchedule[index].periods = [];
    newSchedule[index].periods!.push({ startWeek: 1, endWeek: 52 });
    setScheduleForm(newSchedule);
  };

  const updateSchedulePeriod = (itemIndex: number, periodIndex: number, field: keyof SchedulePeriod, value: number) => {
    const newSchedule = [...scheduleForm];
    if (newSchedule[itemIndex].periods) {
      newSchedule[itemIndex].periods![periodIndex][field] = value;
      setScheduleForm(newSchedule);
    }
  };

  const removePeriodFromItem = (itemIndex: number, periodIndex: number) => {
    const newSchedule = [...scheduleForm];
    if (newSchedule[itemIndex].periods) {
      newSchedule[itemIndex].periods!.splice(periodIndex, 1);
      setScheduleForm(newSchedule);
    }
  };

  const removeScheduleItem = (index: number) => {
    setScheduleForm(scheduleForm.filter((_, i) => i !== index));
  };

  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  if (selectedClass) {
    const classStudents = students.filter(s => s.classGroupId === selectedClass);
    const filteredStudents = classStudents
      .filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedClass(null)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-600" />
          </button>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">
            Classe : {selectedClass}
          </h2>
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => { setIsImportingCsv(!isImportingCsv); setIsAddingStudent(false); }}
              className="bg-white text-zinc-700 border border-zinc-200 p-3 rounded-full shadow-sm hover:bg-zinc-50 transition-colors active:scale-95"
              title="Importer depuis un CSV"
            >
              <Upload className="w-6 h-6" />
            </button>
            <button
              onClick={() => { setIsAddingStudent(!isAddingStudent); setIsImportingCsv(false); }}
              className="bg-primary-600 text-white p-3 rounded-full shadow-md hover:bg-primary-700 transition-colors active:scale-95"
              title="Ajouter un élève manuellement"
            >
              <UserPlus className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher un élève..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>

        {isImportingCsv && (
          <CsvImportWizard 
            onComplete={() => setIsImportingCsv(false)} 
            onCancel={() => setIsImportingCsv(false)} 
          />
        )}

        {isAddingStudent && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xl font-bold mb-4 text-zinc-800 font-display">Nouvel Élève</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={newStudent.firstName}
                    onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={newStudent.lastName}
                    onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Alertes Santé (séparées par des virgules)</label>
                <input
                  type="text"
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newStudent.healthAlerts}
                  onChange={(e) => setNewStudent({ ...newStudent, healthAlerts: e.target.value })}
                  placeholder="Ex: Asthme, PAI, Allergie arachide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Fin de dispense (optionnel)</label>
                <input
                  type="date"
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={newStudent.dispensationEnd}
                  onChange={(e) => setNewStudent({ ...newStudent, dispensationEnd: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
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
            {filteredStudents.map((student) => (
              <li key={student.id} className="p-5 hover:bg-zinc-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg shadow-sm border border-primary-100">
                    {formatLastName(student.lastName)?.[0]}{formatFirstName(student.firstName)?.[0]}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">
                      {formatLastName(student.lastName)} {formatFirstName(student.firstName)}
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
              <li className="p-10 text-center text-zinc-500">
                <Users className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
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
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">Dossiers des Classes</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddingClass(!isAddingClass)}
            className="bg-primary-600 text-white p-3 rounded-full shadow-md hover:bg-primary-700 transition-colors active:scale-95"
            title="Ajouter une classe"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {isAddingClass && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold mb-4 text-zinc-800 font-display">Nouvelle Classe</h3>
          <form onSubmit={handleAddClass} className="flex gap-4">
            <input
              type="text"
              required
              className="flex-1 p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Nom de la classe (ex: 6A)"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
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
            <div key={className} className="bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-primary-50 text-primary-600 rounded-2xl border border-primary-100 shadow-sm">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900 font-display">{className}</h3>
                    <p className="text-sm font-medium text-zinc-500">{classStudents.length} élèves</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => openScheduleModal(className)}
                    className="p-2 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                    title="Gérer l'emploi du temps"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setClassToDelete(className)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Supprimer la classe"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 bg-zinc-50/50">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Emploi du temps</h4>
                {schedule.length > 0 ? (
                  <ul className="space-y-4">
                    {schedule.map((item, idx) => {
                      const facility = facilities.find(f => f.id === item.facilityId);
                      
                      const timeDisplay = item.startTime && item.endTime 
                        ? `${item.startTime} - ${item.endTime}` 
                        : (item.timeSlot || '');
                        
                      const formatDate = (dateStr?: string) => {
                        if (!dateStr) return '';
                        const [year, month, day] = dateStr.split('-');
                        return `${day}/${month}/${year}`;
                      };
                      
                      const periodDisplay = item.periods && item.periods.length > 0
                        ? item.periods.map((p: any) => `S${p.startWeek}-S${p.endWeek}`).join(', ')
                        : (item.startDate && item.endDate
                          ? `Du ${formatDate(item.startDate)} au ${formatDate(item.endDate)}`
                          : (item.period || (item.startWeek && item.endWeek ? `Semaines ${item.startWeek} à ${item.endWeek}` : '')));
                      
                      return (
                        <li key={idx} className="flex flex-col text-sm border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-800">{item.dayOfWeek} {timeDisplay}</span>
                            <span className="text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100 font-medium text-xs">{item.apsa}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-medium text-zinc-500">{periodDisplay}</span>
                            {facility && <span className="text-xs text-primary-600 font-medium bg-white px-2 py-0.5 rounded-md border border-zinc-200">{facility.name}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-400 italic">Aucun emploi du temps défini</p>
                )}
              </div>

              <div className="p-4 border-t border-zinc-100">
                <button
                  onClick={() => setSelectedClass(className)}
                  className="w-full py-2.5 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  Ouvrir le dossier
                </button>
              </div>
            </div>
          );
        })}
        {allClasses.length === 0 && !isAddingClass && (
          <div className="col-span-full p-12 text-center text-zinc-500 bg-white rounded-2xl border border-zinc-200 border-dashed">
            <Folder className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-lg font-medium">Aucune classe trouvée</p>
            <p className="text-sm mt-1">Ajoutez une classe ou importez des élèves pour commencer.</p>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {editingScheduleClass && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto border border-white/50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-zinc-900 font-display">Emploi du temps - {editingScheduleClass}</h3>
              <button onClick={() => setEditingScheduleClass(null)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors">
                <Settings className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5 mb-8">
              {scheduleForm.map((item, index) => (
                <div key={index} className="flex flex-col gap-4 bg-zinc-50/80 p-5 rounded-2xl border border-zinc-200 relative">
                  <button
                    onClick={() => removeScheduleItem(index)}
                    className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                  >
                    &times;
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Jour</label>
                      <select
                        value={item.dayOfWeek}
                        onChange={(e) => updateScheduleItem(index, 'dayOfWeek', e.target.value)}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Horaires</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={item.startTime || ''}
                          onChange={(e) => updateScheduleItem(index, 'startTime', e.target.value)}
                          className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-zinc-400 text-sm font-medium">à</span>
                        <input
                          type="time"
                          value={item.endTime || ''}
                          onChange={(e) => updateScheduleItem(index, 'endTime', e.target.value)}
                          className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-10">
                    <div className="md:col-span-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Périodes</label>
                        <button type="button" onClick={() => addPeriodToItem(index)} className="text-xs text-primary-600 hover:text-primary-700 font-bold">+ Ajouter</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {item.periods?.map((period, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-2 relative group">
                            <span className="text-zinc-400 text-xs font-medium w-8">De S</span>
                            <input
                              type="number"
                              min="1"
                              max="52"
                              value={period.startWeek || ''}
                              onChange={(e) => updateSchedulePeriod(index, pIdx, 'startWeek', parseInt(e.target.value, 10))}
                              className="w-full p-2 border border-zinc-300 rounded-lg bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <span className="text-zinc-400 text-xs font-medium w-8 text-center">à S</span>
                            <input
                              type="number"
                              min="1"
                              max="52"
                              value={period.endWeek || ''}
                              onChange={(e) => updateSchedulePeriod(index, pIdx, 'endWeek', parseInt(e.target.value, 10))}
                              className="w-full p-2 border border-zinc-300 rounded-lg bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            {item.periods!.length > 1 && (
                              <button type="button" onClick={() => removePeriodFromItem(index, pIdx)} className="absolute -right-6 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Lieu</label>
                      <select
                        value={item.facilityId || ''}
                        onChange={(e) => updateScheduleItem(index, 'facilityId', e.target.value)}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Sélectionner...</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Sport (APSA)</label>
                      <select
                        value={item.apsa}
                        onChange={(e) => updateScheduleItem(index, 'apsa', e.target.value)}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl bg-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Sélectionner...</option>
                        {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addScheduleItem}
                className="w-full py-4 border-2 border-dashed border-zinc-300 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-50 hover:border-zinc-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Ajouter un créneau
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setEditingScheduleClass(null)}
                className="px-6 py-3 text-zinc-600 font-bold hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveSchedule}
                className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Supprimer la classe</h2>
              <p className="text-zinc-600">
                Êtes-vous sûr de vouloir supprimer la classe <span className="font-bold">{classToDelete}</span> ? 
                Cette action supprimera également tous les élèves associés à cette classe. 
                Cette action est irréversible.
              </p>
            </div>
            <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
              <button
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteClass}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
