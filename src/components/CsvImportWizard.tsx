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

  const [mapping, setMapping] = useState({
    firstName: '',
    lastName: '',
    classGroupId: '',
    healthAlerts: ''
  });

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
            firstName: results.meta.fields.find(f => f.toLowerCase().includes('prénom') || f.toLowerCase().includes('prenom') || f.toLowerCase() === 'first name') || '',
            lastName: results.meta.fields.find(f => f.toLowerCase().includes('nom') || f.toLowerCase() === 'last name') || '',
            classGroupId: results.meta.fields.find(f => f.toLowerCase().includes('classe') || f.toLowerCase() === 'class') || '',
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
    if (!mapping.firstName || !mapping.lastName || !mapping.classGroupId) {
      setError("Veuillez mapper au moins le prénom, le nom et la classe.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const batchPromises = data.map(row => {
        const healthAlertsStr = mapping.healthAlerts ? row[mapping.healthAlerts] : '';
        const healthAlerts = healthAlertsStr ? healthAlertsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        return addDoc(collection(db, 'students'), {
          firstName: row[mapping.firstName],
          lastName: row[mapping.lastName],
          classGroupId: row[mapping.classGroupId],
          healthAlerts: healthAlerts,
          dispensationEnd: null,
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          Importer des élèves (CSV)
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-400 mb-3" />
            <span className="text-slate-700 font-medium mb-1">Cliquez pour sélectionner un fichier CSV</span>
            <span className="text-slate-500 text-sm">Le fichier doit contenir des colonnes (ex: Nom, Prénom, Classe)</span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{data.length} lignes détectées</p>
              </div>
            </div>
            <button 
              onClick={() => { setFile(null); setData([]); setHeaders([]); }}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Changer de fichier
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-slate-800">Associer les colonnes :</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <select 
                  value={mapping.firstName}
                  onChange={(e) => setMapping({...mapping, firstName: e.target.value})}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Sélectionner --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <select 
                  value={mapping.lastName}
                  onChange={(e) => setMapping({...mapping, lastName: e.target.value})}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Sélectionner --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Classe <span className="text-red-500">*</span>
                </label>
                <select 
                  value={mapping.classGroupId}
                  onChange={(e) => setMapping({...mapping, classGroupId: e.target.value})}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Sélectionner --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Alertes Santé (Optionnel)
                </label>
                <select 
                  value={mapping.healthAlerts}
                  onChange={(e) => setMapping({...mapping, healthAlerts: e.target.value})}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Ignorer --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {data.length > 0 && mapping.firstName && mapping.lastName && mapping.classGroupId && (
            <div className="mt-6">
              <h4 className="font-medium text-slate-800 mb-2">Aperçu (3 premières lignes) :</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2">Prénom</th>
                      <th className="px-4 py-2">Nom</th>
                      <th className="px-4 py-2">Classe</th>
                      <th className="px-4 py-2">Santé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{row[mapping.firstName]}</td>
                        <td className="px-4 py-2">{row[mapping.lastName]}</td>
                        <td className="px-4 py-2">{row[mapping.classGroupId]}</td>
                        <td className="px-4 py-2">{mapping.healthAlerts ? row[mapping.healthAlerts] : '-'}</td>
                      </tr>
                    ))}
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              disabled={isImporting}
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !mapping.firstName || !mapping.lastName || !mapping.classGroupId}
              className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
