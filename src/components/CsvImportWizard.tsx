import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, Check, AlertCircle, X, FileText } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface CsvImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function CsvImportWizard({ onComplete, onCancel }: CsvImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetClass, setTargetClass] = useState('');
  const [mapping, setMapping] = useState({
    fullName: '',
    healthAlerts: ''
  });

  const parseFullName = (fullName: string) => {
    if (!fullName) return { firstName: '', lastName: '' };
    
    let lastNameParts: string[] = [];
    let firstNameParts: string[] = [];
    const words = fullName.trim().split(/\s+/);
    
    for (const word of words) {
      // Un mot est considéré comme un nom de famille s'il est entièrement en majuscules
      // et contient au moins une lettre (pour ignorer la ponctuation seule)
      if (word === word.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(word.toUpperCase())) {
        lastNameParts.push(word);
      } else {
        firstNameParts.push(word);
      }
    }

    // Fallbacks si tout est allé du même côté
    if (lastNameParts.length === 0 && words.length > 0) {
      lastNameParts = [words[0]];
      firstNameParts = words.slice(1);
    }
    if (firstNameParts.length === 0 && words.length > 1) {
      firstNameParts = [words[words.length - 1]];
      lastNameParts = words.slice(0, -1);
    }

    return {
      firstName: firstNameParts.join(' '),
      lastName: lastNameParts.join(' ')
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Erreur lors de la lecture du fichier CSV.");
          return;
        }
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          setData(results.data);
          
          // Auto-guess mapping
          const guessMapping = {
            fullName: results.meta.fields.find(f => f.toLowerCase().includes('nom') || f.toLowerCase().includes('élève') || f.toLowerCase().includes('eleve')) || '',
            healthAlerts: results.meta.fields.find(f => f.toLowerCase().includes('santé') || f.toLowerCase().includes('sante') || f.toLowerCase().includes('alerte')) || ''
          };
          setMapping(guessMapping);
        }
      },
      error: (error) => {
        setError(error.message);
      }
    });
  };

  const handleImport = async () => {
    if (!auth.currentUser) return;
    if (!mapping.fullName || !targetClass.trim()) {
      setError("Veuillez mapper la colonne du nom et définir la classe.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const batchPromises = data.map(row => {
        const healthAlertsStr = mapping.healthAlerts ? row[mapping.healthAlerts] : '';
        const healthAlerts = healthAlertsStr ? healthAlertsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        const { firstName, lastName } = parseFullName(row[mapping.fullName] || '');

        return addDoc(collection(db, 'students'), {
          firstName: firstName || '-',
          lastName: lastName || '-',
          classGroupId: targetClass.trim(),
          healthAlerts: healthAlerts,
          teacherId: auth.currentUser!.uid,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(batchPromises);
      onComplete();
    } catch (err) {
      console.error("Erreur d'importation:", err);
      setError("Une erreur est survenue lors de l'importation des élèves.");
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-zinc-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Importer des élèves (CSV)
        </h3>
        <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:bg-zinc-50 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
            <FileText className="w-12 h-12 text-zinc-400 mb-3" />
            <span className="text-zinc-700 font-medium mb-1">Cliquez pour sélectionner un fichier CSV</span>
            <span className="text-zinc-500 text-sm">Le fichier doit contenir au moins une colonne avec le Nom et Prénom</span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-zinc-800">{file.name}</p>
                <p className="text-xs text-zinc-500">{data.length} lignes détectées</p>
              </div>
            </div>
            <button 
              onClick={() => { setFile(null); setData([]); setHeaders([]); }}
              className="text-sm text-zinc-500 hover:text-zinc-700 underline"
            >
              Changer de fichier
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-zinc-800">Configuration de l'import :</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-1">
                  Classe cible <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  placeholder="Ex: 6A, 5B..."
                  className="w-full p-2.5 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700 flex items-center gap-1">
                  Colonne Nom & Prénom <span className="text-red-500">*</span>
                </label>
                <select 
                  value={mapping.fullName}
                  onChange={(e) => setMapping({...mapping, fullName: e.target.value})}
                  className="w-full p-2.5 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Sélectionner --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <p className="text-xs text-zinc-500 mt-1">Le nom (en majuscules) sera séparé du prénom automatiquement.</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-zinc-700">
                  Alertes Santé (Optionnel)
                </label>
                <select 
                  value={mapping.healthAlerts}
                  onChange={(e) => setMapping({...mapping, healthAlerts: e.target.value})}
                  className="w-full p-2.5 bg-white border border-zinc-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Ignorer --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {data.length > 0 && mapping.fullName && targetClass && (
            <div className="mt-6">
              <h4 className="font-medium text-zinc-800 mb-2">Aperçu (3 premières lignes) :</h4>
              <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50 text-zinc-600 font-medium border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-2">Nom extrait</th>
                      <th className="px-4 py-2">Prénom extrait</th>
                      <th className="px-4 py-2">Classe</th>
                      <th className="px-4 py-2">Santé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.slice(0, 3).map((row, i) => {
                      const { firstName, lastName } = parseFullName(row[mapping.fullName] || '');
                      return (
                        <tr key={i}>
                          <td className="px-4 py-2 font-medium">{lastName}</td>
                          <td className="px-4 py-2">{firstName}</td>
                          <td className="px-4 py-2">{targetClass}</td>
                          <td className="px-4 py-2">{mapping.healthAlerts ? row[mapping.healthAlerts] : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-zinc-600 font-medium hover:bg-zinc-100 rounded-xl transition-colors"
              disabled={isImporting}
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !mapping.fullName || !targetClass.trim()}
              className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>Importation en cours...</>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Importer {data.length} élèves
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
