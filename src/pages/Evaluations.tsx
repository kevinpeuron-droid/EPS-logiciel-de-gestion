import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GoogleGenAI } from '@google/genai';
import { ClipboardCheck, Sparkles, Loader2, Save } from 'lucide-react';
import { formatFirstName, formatLastName } from '../lib/utils';

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey && typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'missing-api-key' });
  }
  return aiInstance;
}

function EvaluationRow({ student, selectedApsa, evaluations, onGenerateComment, isGenerating }: any) {
  const evalData = evaluations.find((e: any) => e.studentId === student.id && e.apsa === selectedApsa);
  const [grade, setGrade] = useState<string>(evalData?.grade?.toString() || '');
  const maxGrade = 20;

  useEffect(() => {
    setGrade(evalData?.grade?.toString() || '');
  }, [evalData]);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold">
            {formatLastName(student.lastName)?.[0]}{formatFirstName(student.firstName)?.[0]}
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">{formatLastName(student.lastName)} {formatFirstName(student.firstName)}</h3>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Classe: {student.classGroupId}</p>
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
            className="w-20 p-2 text-center border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary font-bold text-lg"
          />
          <span className="text-zinc-400 font-bold">/ {maxGrade}</span>
        </div>
      </div>

      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 relative">
        {evalData?.comment ? (
          <p className="text-sm text-zinc-700 italic">"{evalData.comment}"</p>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-sm text-zinc-400 italic">Aucune appréciation générée.</p>
            <button
              onClick={() => onGenerateComment(student, Number(grade), maxGrade)}
              disabled={!grade || isGenerating === student.id}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
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
  const [sports, setSports] = useState<any[]>([]);
  const [selectedApsa, setSelectedApsa] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qStudents = query(
      collection(db, 'students'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qEvals = query(
      collection(db, 'evaluations'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubEvals = onSnapshot(qEvals, (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qSports = query(
      collection(db, 'sports'),
      where('teacherId', '==', auth.currentUser.uid)
    );
    const unsubSports = onSnapshot(qSports, (snapshot) => {
      const data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSports(data);
      setSelectedApsa(prev => {
        if (!prev && data.length > 0) return data[0].name;
        return prev;
      });
    });

    return () => {
      unsubStudents();
      unsubEvals();
      unsubSports();
    };
  }, []);

  const handleGenerateComment = async (student: any, grade: number, maxGrade: number) => {
    if (!grade || !maxGrade) return;
    setIsGenerating(student.id);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `En tant que professeur d'EPS, rédige une appréciation courte (1 phrase) et constructive pour l'élève ${formatFirstName(student.firstName)} ${formatLastName(student.lastName)} qui a obtenu la note de ${grade}/${maxGrade} en ${selectedApsa}. Le ton doit être encourageant et professionnel.`,
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
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Évaluations</h2>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200">
        <label className="block text-sm font-medium text-zinc-700 mb-2">Sélectionner l'APSA en cours</label>
        <select
          className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-medium"
          value={selectedApsa}
          onChange={(e) => setSelectedApsa(e.target.value)}
        >
          {sports.length === 0 && <option value="" disabled>Aucun sport configuré</option>}
          {sports.map(sport => (
            <option key={sport.id} value={sport.name}>{sport.name}</option>
          ))}
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
          <div className="text-center py-12 text-zinc-500 bg-white rounded-2xl border border-zinc-200 border-dashed">
            <ClipboardCheck className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
            <p className="text-lg font-medium">Aucun élève à évaluer</p>
            <p className="text-sm">Ajoutez des élèves dans l'onglet Élèves.</p>
          </div>
        )}
      </div>
    </div>
  );
}
