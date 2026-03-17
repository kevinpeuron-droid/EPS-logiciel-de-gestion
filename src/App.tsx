import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';
import { Layout } from './components/Layout';
import { Sessions } from './pages/Sessions';
import { Students } from './pages/Students';
import { Evaluations } from './pages/Evaluations';
import { Facilities } from './pages/Facilities';
import { Sports } from './pages/Sports';
import { ClipboardCheck, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || "Une erreur est survenue lors de la connexion.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">EPS-Master</h1>
          <p className="text-slate-500 text-lg">L'application terrain pour les professeurs d'EPS.</p>
          
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuer avec Google
          </button>
          
          {loginError && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm text-left border border-red-100">
              <p className="font-bold mb-1">Erreur de connexion :</p>
              <p className="break-words">{loginError}</p>
              {loginError.includes('auth/unauthorized-domain') && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-red-200 shadow-sm">
                  <p className="font-bold text-slate-800 mb-2">🚨 Action requise dans Firebase</p>
                  <p className="text-slate-600 mb-2">Google bloque la connexion car l'adresse de cette application a changé. Vous devez l'autoriser :</p>
                  <ol className="list-decimal pl-4 space-y-2 text-slate-700">
                    <li>
                      <a 
                        href="https://console.firebase.google.com/project/gen-lang-client-0769442824/authentication/settings" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Ouvrez vos paramètres Firebase (cliquez ici)
                      </a>
                    </li>
                    <li>Descendez jusqu'à <strong>Domaines autorisés</strong> et cliquez sur <strong>Ajouter un domaine</strong>.</li>
                    <li>
                      Copiez ce texte exact :
                      <div className="flex items-center gap-2 mt-1 mb-1">
                        <code className="bg-slate-100 px-2 py-1 rounded text-xs select-all">{window.location.hostname}</code>
                        <button 
                          onClick={() => navigator.clipboard.writeText(window.location.hostname)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Copier
                        </button>
                      </div>
                    </li>
                    <li>Cliquez sur <strong>Ajouter</strong>, puis revenez ici et réessayez.</li>
                  </ol>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <p><strong>Note :</strong> Si le domaine est déjà ajouté et que ça bloque toujours, cela peut venir de votre navigateur (Safari, Brave) ou d'un bloqueur de pub qui empêche les cookies tiers. Essayez sur Chrome ou désactivez votre bloqueur.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Sessions />} />
          <Route path="students" element={<Students />} />
          <Route path="evaluations" element={<Evaluations />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="sports" element={<Sports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
