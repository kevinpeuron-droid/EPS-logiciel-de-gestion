import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { ClipboardCheck, Sparkles, Loader2, Save } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

function EvaluationRow({ student, selectedApsa, evaluations, onGenerateComment, isGenerating }: any) {
  const evalData = evaluations.find((e: any) => e.studentId === student.id && e.apsa === selectedApsa);
  const [grade, setGrade] = useState<string>(evalData?.grade?.toString() || '');
  const maxGrade = 20;

  useEffect(() => {
    setGrade(evalData?.grade?.toString() || '');
  }, [evalData]);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{student.firstName} {student.lastName}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Classe: {student.classGroupId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max={maxGrade}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Note"
            className="w-20 p-2 text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
          />
          <span className="text-slate-400 font-bold">/ {maxGrade}</span>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
        {evalData?.comment ? (
          <p className="text-sm text-slate-700 italic">"{evalData.comment}"</p>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-400 italic">Aucune appréciation générée.</p>
            <button
              onClick={() => onGenerateComment(student, Number(grade), maxGrade)}
              disabled={!grade || isGenerating === student.id}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating === student.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Générer avec l'IA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Evaluations() {
  const [students, setStudents] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [selectedApsa, setSelectedApsa] = useState('Acrosport');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qStudents = query(collection(db, 'students'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qEvals = query(collection(db, 'evaluations'));
    const unsubEvals = onSnapshot(qEvals, (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubEvals();
    };
  }, []);

  const handleGenerateComment = async (student: any, grade: number, maxGrade: number) => {
    if (!grade || !maxGrade) return;
    setIsGenerating(student.id);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `En tant que professeur d'EPS, rédige une appréciation courte (1 phrase) et constructive pour l'élève ${student.firstName} ${student.lastName} qui a obtenu la note de ${grade}/${maxGrade} en ${selectedApsa}. Le ton doit être encourageant et professionnel.`,
      });

      const comment = response.text.trim();
      
      // Save to Firebase
      await addDoc(collection(db, 'evaluations'), {
        studentId: student.id,
        apsa: selectedApsa,
        grade: Number(grade),
        maxGrade: Number(maxGrade),
        comment: comment,
        teacherId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error generating comment:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Évaluations</h2>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Sélectionner l'APSA en cours</label>
        <select
          className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
          value={selectedApsa}
          onChange={(e) => setSelectedApsa(e.target.value)}
        >
          <option value="Acrosport">Acrosport</option>
          <option value="Badminton">Badminton</option>
          <option value="Demi-fond">Demi-fond</option>
          <option value="Natation">Natation</option>
        </select>
      </div>

      <div className="space-y-4">
        {students.map((student) => (
          <EvaluationRow
            key={student.id}
            student={student}
            selectedApsa={selectedApsa}
            evaluations={evaluations}
            onGenerateComment={handleGenerateComment}
            isGenerating={isGenerating}
          />
        ))}
        
        {students.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-lg font-medium">Aucun élève à évaluer</p>
            <p className="text-sm">Ajoutez des élèves dans l'onglet Élèves.</p>
          </div>
        )}
      </div>
    </div>
  );
}
