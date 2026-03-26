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
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-200/40 rounded-full blur-3xl" />

        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50 max-w-md w-full text-center space-y-8 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/30">
            <ClipboardCheck className="w-10 h-10" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight font-display">Minguen-EPS</h1>
            <p className="text-zinc-500 text-lg font-medium">L'application terrain pour les professeurs d'EPS.</p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-zinc-900/20 active:scale-[0.98] flex items-center justify-center gap-3"
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
            <div className="mt-6 p-5 bg-red-50/80 backdrop-blur-sm text-red-700 rounded-2xl text-sm text-left border border-red-100/50 shadow-sm">
              <p className="font-bold mb-2 text-red-800">Erreur de connexion :</p>
              <p className="break-words mb-3">{loginError}</p>
              {loginError.includes('auth/unauthorized-domain') && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                  <p className="font-bold text-zinc-800 mb-2">🚨 Action requise dans Firebase</p>
                  <p className="text-zinc-600 mb-3">Google bloque la connexion car l'adresse de cette application a changé. Vous devez l'autoriser :</p>
                  <ol className="list-decimal pl-5 space-y-3 text-zinc-700">
                    <li>
                      <a 
                        href="https://console.firebase.google.com/project/gen-lang-client-0769442824/authentication/settings" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 font-semibold hover:underline"
                      >
                        Ouvrez vos paramètres Firebase (cliquez ici)
                      </a>
                    </li>
                    <li>Descendez jusqu'à <strong>Domaines autorisés</strong> et cliquez sur <strong>Ajouter un domaine</strong>.</li>
                    <li>
                      Copiez ce texte exact :
                      <div className="flex items-center gap-2 mt-2 mb-2 bg-zinc-50 p-1.5 rounded-lg border border-zinc-200">
                        <code className="px-2 py-1 text-xs select-all font-mono text-zinc-800 flex-1">{window.location.hostname}</code>
                        <button 
                          onClick={() => navigator.clipboard.writeText(window.location.hostname)}
                          className="bg-white hover:bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-zinc-200 shadow-sm"
                        >
                          Copier
                        </button>
                      </div>
                    </li>
                    <li>Cliquez sur <strong>Ajouter</strong>, puis revenez ici et réessayez.</li>
                  </ol>
                  <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-500">
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
