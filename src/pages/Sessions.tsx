import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, setDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db, auth } from '../firebase';
import { FileUpload } from '../components/FileUpload';
import { Plus, FileText, Calendar as CalendarIcon, MapPin, Clock, ChevronLeft, ChevronRight, Edit3, AlertCircle } from 'lucide-react';
import { format, addDays, subDays, parseISO, isWithinInterval, startOfDay, endOfDay, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function Sessions() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    pdfUrls: [] as string[]
  });

  // Google Calendar State
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const connectGoogleCalendar = async () => {
    try {
      setIsLoadingCalendar(true);
      setCalendarError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleToken(token);
      }
    } catch (error: any) {
      console.error('Error connecting to Google Calendar:', error);
      setCalendarError("Erreur lors de la connexion à l'agenda Google.");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!googleToken) return;
      
      try {
        setIsLoadingCalendar(true);
        setCalendarError(null);
        const timeMin = startOfDay(selectedDate).toISOString();
        const timeMax = endOfDay(selectedDate).toISOString();
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              Authorization: `Bearer ${googleToken}`
            }
          }
        );
        
        if (!response.ok) {
          if (response.status === 401) {
            setGoogleToken(null); // Token expired
            throw new Error("Session expirée, veuillez vous reconnecter.");
          }
          throw new Error("Erreur lors de la récupération des événements.");
        }
        
        const data = await response.json();
        setCalendarEvents(data.items || []);
      } catch (error: any) {
        console.error('Error fetching calendar events:', error);
        setCalendarError(error.message || "Impossible de charger l'agenda.");
      } finally {
        setIsLoadingCalendar(false);
      }
    };

    fetchCalendarEvents();
  }, [selectedDate, googleToken]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch sessions
    const qSessions = query(
      collection(db, 'sessions'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch classGroups
    const qClasses = query(
      collection(db, 'classGroups'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      setClassGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch sports
    const qSports = query(
      collection(db, 'sports'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubSports = onSnapshot(qSports, (snapshot) => {
      const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSports(data);
    });

    // Fetch facilities
    const qFacilities = query(
      collection(db, 'facilities'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubFacilities = onSnapshot(qFacilities, (snapshot) => {
      setFacilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSessions();
      unsubClasses();
      unsubSports();
      unsubFacilities();
    };
  }, []);

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !editingSlot) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const sessionId = editingSlot.existingSession?.id;

    const sessionData = {
      title: sessionForm.title,
      description: sessionForm.description,
      pdfUrls: sessionForm.pdfUrls,
      date: dateStr,
      classGroupId: editingSlot.className,
      apsa: editingSlot.apsa,
      startTime: editingSlot.startTime,
      endTime: editingSlot.endTime,
      teacherId: auth.currentUser.uid,
      updatedAt: serverTimestamp()
    };

    try {
      if (sessionId) {
        await setDoc(doc(db, 'sessions', sessionId), sessionData, { merge: true });
      } else {
        await addDoc(collection(db, 'sessions'), {
          ...sessionData,
          createdAt: serverTimestamp()
        });
      }
      setEditingSlot(null);
      setSessionForm({ title: '', description: '', pdfUrls: [] });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const openProgramModal = (slot: any) => {
    setEditingSlot(slot);
    if (slot.existingSession) {
      setSessionForm({
        title: slot.existingSession.title || '',
        description: slot.existingSession.description || '',
        pdfUrls: slot.existingSession.pdfUrls || []
      });
    } else {
      setSessionForm({
        title: '',
        description: '',
        pdfUrls: []
      });
    }
  };

  // Generate daily schedule
  const currentDayName = DAYS_FR[selectedDate.getDay()];
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const dailySlots: any[] = [];

  classGroups.forEach(cg => {
    if (!cg.scheduleJson) return;
    try {
      const schedule = JSON.parse(cg.scheduleJson);
      schedule.forEach((item: any) => {
        if (item.dayOfWeek === currentDayName) {
          // Check date bounds if they exist
          let isWithinBounds = true;
          if (item.startWeek && item.endWeek) {
            const currentWeek = getISOWeek(selectedDate);
            if (item.startWeek <= item.endWeek) {
              if (currentWeek < item.startWeek || currentWeek > item.endWeek) {
                isWithinBounds = false;
              }
            } else {
              // Wraps around the year (e.g., 36 to 24)
              if (currentWeek < item.startWeek && currentWeek > item.endWeek) {
                isWithinBounds = false;
              }
            }
          } else if (item.startDate && item.endDate) {
            const start = startOfDay(parseISO(item.startDate));
            const end = endOfDay(parseISO(item.endDate));
            if (!isWithinInterval(selectedDate, { start, end })) {
              isWithinBounds = false;
            }
          }

          if (isWithinBounds) {
            // Find if a session is already programmed for this slot on this date
            const existingSession = sessions.find(s => 
              s.date === dateStr && 
              s.classGroupId === cg.name && 
              s.startTime === item.startTime
            );

            dailySlots.push({
              className: cg.name,
              startTime: item.startTime,
              endTime: item.endTime,
              apsa: item.apsa,
              facilityId: item.facilityId,
              existingSession
            });
          }
        }
      });
    } catch (e) {
      console.error("Error parsing schedule for class", cg.name, e);
    }
  });

  // Sort slots by start time
  dailySlots.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar - Google Calendar */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Google Agenda</h3>
              <p className="text-xs font-medium text-zinc-500">Événements du jour</p>
            </div>
          </div>
          <div className="p-4">
            {!googleToken ? (
              <div className="text-center py-6">
                <p className="text-sm text-zinc-500 mb-4">Connectez votre compte Google pour voir vos événements.</p>
                <button 
                  onClick={connectGoogleCalendar}
                  disabled={isLoadingCalendar}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isLoadingCalendar ? 'Connexion...' : "Connecter l'agenda"}
                </button>
                {calendarError && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{calendarError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isLoadingCalendar ? (
                  <div className="text-center py-4 text-sm text-zinc-500">Chargement...</div>
                ) : calendarEvents.length === 0 ? (
                  <div className="text-center py-6 text-sm text-zinc-500">
                    Aucun événement prévu aujourd'hui.
                  </div>
                ) : (
                  calendarEvents.map((event) => {
                    const isAllDay = !!event.start.date;
                    const startTime = isAllDay ? 'Toute la journée' : format(parseISO(event.start.dateTime), 'HH:mm');
                    const endTime = isAllDay ? '' : format(parseISO(event.end.dateTime), 'HH:mm');
                    
                    return (
                      <div key={event.id} className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 line-clamp-2">{event.summary}</h4>
                            <p className="text-xs font-medium text-blue-600 mt-1">
                              {startTime} {endTime && `- ${endTime}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {calendarError && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{calendarError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Sessions */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 font-display">Emploi du temps</h2>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-zinc-200">
            <button 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-zinc-800 capitalize">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </span>
            </div>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-600" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {dailySlots.length > 0 ? (
          dailySlots.map((slot, idx) => {
            const facility = facilities.find(f => f.id === slot.facilityId);
            const isProgrammed = !!slot.existingSession;

            return (
              <div key={idx} className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${isProgrammed ? 'border-primary-200 ring-1 ring-primary-100' : 'border-zinc-200'}`}>
                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  
                  {/* Time & Class Badge */}
                  <div className="flex items-center gap-4 md:w-1/4 shrink-0">
                    <div className="flex flex-col items-center justify-center bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 min-w-[100px]">
                      <span className="font-bold text-zinc-900">{slot.startTime || '--:--'}</span>
                      <span className="text-xs text-zinc-400 font-medium">à {slot.endTime || '--:--'}</span>
                    </div>
                    <div>
                      <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 font-bold rounded-lg border border-primary-100">
                        {slot.className}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">APSA</span>
                      <span className="font-medium text-zinc-800">{slot.apsa || 'Non défini'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Lieu</span>
                      <div className="flex items-center text-zinc-800 font-medium">
                        <MapPin className="w-4 h-4 mr-1.5 text-zinc-400" />
                        {facility ? facility.name : 'Non défini'}
                      </div>
                    </div>
                  </div>

                  {/* Actions / Status */}
                  <div className="md:w-1/4 shrink-0 flex justify-end">
                    {isProgrammed ? (
                      <button 
                        onClick={() => openProgramModal(slot)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold rounded-xl transition-colors border border-primary-200"
                      >
                        <Edit3 className="w-4 h-4" />
                        Voir / Modifier
                      </button>
                    ) : (
                      <button 
                        onClick={() => openProgramModal(slot)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-zinc-300 text-zinc-600 hover:border-primary-400 hover:text-primary-600 font-semibold rounded-xl transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Programmer
                      </button>
                    )}
                  </div>
                </div>

                {/* Programmed Content Preview */}
                {isProgrammed && (
                  <div className="bg-zinc-50 border-t border-zinc-100 p-5">
                    <h4 className="font-bold text-zinc-900 mb-2">{slot.existingSession.title}</h4>
                    {slot.existingSession.description && (
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap mb-4">{slot.existingSession.description}</p>
                    )}
                    
                    {slot.existingSession.pdfUrls && slot.existingSession.pdfUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {slot.existingSession.pdfUrls.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-medium rounded-lg border border-zinc-200 transition-colors shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="w-4 h-4 mr-2 text-primary-500" />
                            Document {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-zinc-200 border-dashed">
            <CalendarIcon className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Aucun cours prévu</h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              Vous n'avez pas de cours programmé dans l'emploi du temps pour ce jour. 
              Vous pouvez configurer l'emploi du temps dans l'onglet "Classes".
            </p>
          </div>
        )}
      </div>

      {/* Program Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto border border-white/50">
            <h3 className="text-2xl font-bold text-zinc-900 font-display mb-2">
              {editingSlot.existingSession ? 'Modifier la séance' : 'Programmer la séance'}
            </h3>
            <p className="text-zinc-500 mb-6">
              {editingSlot.className} • {editingSlot.apsa} • {editingSlot.startTime} - {editingSlot.endTime}
            </p>

            <form onSubmit={handleSaveSession} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">Titre de la séance</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  placeholder="Ex: Évaluation diagnostique, Cycle 1 Séance 3..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1.5">Description / Objectifs</label>
                <textarea
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm min-h-[120px]"
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                  placeholder="Détaillez le déroulement de la séance, les objectifs, le matériel nécessaire..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Documents joints (PDF)</label>
                <FileUpload
                  onUploadComplete={(url, name) => {
                    setSessionForm(prev => ({ ...prev, pdfUrls: [...prev.pdfUrls, url] }));
                  }}
                />
                {sessionForm.pdfUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sessionForm.pdfUrls.map((url, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-700 text-sm font-medium border border-zinc-200">
                        <FileText className="w-4 h-4 mr-2 text-primary-500" />
                        Document {i + 1}
                        <button 
                          type="button"
                          onClick={() => setSessionForm(prev => ({ ...prev, pdfUrls: prev.pdfUrls.filter((_, idx) => idx !== i) }))}
                          className="ml-2 text-zinc-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-6 py-3 text-zinc-600 font-bold hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
