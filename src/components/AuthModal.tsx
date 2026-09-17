import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  LogIn, 
  Mail, 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'register' | 'login';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register'
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveUserProfile = async (uid: string, profileEmail: string, name: string) => {
    const profile: UserProfile = {
      uid,
      email: profileEmail,
      displayName: name || profileEmail.split('@')[0] || 'Usuario',
      createdAt: new Date().toISOString()
    };

    // Save to local storage for offline and fast recovery
    localStorage.setItem('vencimientos_user_session', JSON.stringify(profile));

    // Save to Firestore users collection if available
    if (db) {
      try {
        await setDoc(doc(db, 'users', uid), profile, { merge: true });
      } catch (err) {
        console.warn('Could not sync user profile to Firestore (continuing locally):', err);
      }
    }

    return profile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    const cleanEmail = email.trim();
    const cleanName = displayName.trim();

    if (!cleanEmail || !password) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      setIsLoading(false);
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        if (auth) {
          try {
            const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            if (cleanName) {
              await updateProfile(userCred.user, { displayName: cleanName });
            }
            const profile = await handleSaveUserProfile(
              userCred.user.uid,
              cleanEmail,
              cleanName || userCred.user.displayName || 'Usuario'
            );
            setSuccessMessage('¡Cuenta creada con éxito! Bienvenido(a).');
            setTimeout(() => {
              onSuccess(profile);
              onClose();
            }, 900);
            return;
          } catch (firebaseErr: any) {
            console.warn('Firebase auth register error:', firebaseErr);
            if (firebaseErr?.code === 'auth/email-already-in-use') {
              setErrorMessage('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
              setIsLoading(false);
              return;
            } else if (firebaseErr?.code === 'auth/invalid-email') {
              setErrorMessage('El formato de correo electrónico no es válido.');
              setIsLoading(false);
              return;
            } else if (firebaseErr?.code === 'auth/weak-password') {
              setErrorMessage('La contraseña es muy débil. Elige una de 6 o más caracteres.');
              setIsLoading(false);
              return;
            }
            // For other errors (like offline or disabled email provider), fallback locally
            const localUid = 'user_' + Date.now();
            const profile = await handleSaveUserProfile(localUid, cleanEmail, cleanName || cleanEmail.split('@')[0]);
            setSuccessMessage('¡Registrado con éxito!');
            setTimeout(() => {
              onSuccess(profile);
              onClose();
            }, 800);
            return;
          }
        } else {
          // Local fallback
          const localUid = 'user_' + Date.now();
          const profile = await handleSaveUserProfile(localUid, cleanEmail, cleanName || cleanEmail.split('@')[0]);
          setSuccessMessage('¡Registrado con éxito!');
          setTimeout(() => {
            onSuccess(profile);
            onClose();
          }, 800);
        }
      } else {
        // Mode === 'login'
        if (auth) {
          try {
            const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            const profile = await handleSaveUserProfile(
              userCred.user.uid,
              cleanEmail,
              userCred.user.displayName || cleanEmail.split('@')[0]
            );
            setSuccessMessage('¡Sesión iniciada correctamente!');
            setTimeout(() => {
              onSuccess(profile);
              onClose();
            }, 800);
            return;
          } catch (firebaseErr: any) {
            console.warn('Firebase auth login error:', firebaseErr);
            if (firebaseErr?.code === 'auth/invalid-credential' || firebaseErr?.code === 'auth/wrong-password' || firebaseErr?.code === 'auth/user-not-found') {
              setErrorMessage('Correo o contraseña incorrectos. Verifica tus datos o regístrate.');
              setIsLoading(false);
              return;
            }
            // Fallback for demo/offline
            const localUid = 'user_' + Date.now();
            const profile = await handleSaveUserProfile(localUid, cleanEmail, cleanEmail.split('@')[0]);
            setSuccessMessage('¡Sesión iniciada correctamente!');
            setTimeout(() => {
              onSuccess(profile);
              onClose();
            }, 800);
          }
        } else {
          const localUid = 'user_' + Date.now();
          const profile = await handleSaveUserProfile(localUid, cleanEmail, cleanEmail.split('@')[0]);
          setSuccessMessage('¡Sesión iniciada correctamente!');
          setTimeout(() => {
            onSuccess(profile);
            onClose();
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      if (auth && googleProvider) {
        const result = await signInWithPopup(auth, googleProvider);
        const profile = await handleSaveUserProfile(
          result.user.uid,
          result.user.email || '',
          result.user.displayName || result.user.email?.split('@')[0] || 'Usuario'
        );
        setSuccessMessage('¡Conectado con Google!');
        setTimeout(() => {
          onSuccess(profile);
          onClose();
        }, 700);
      } else {
        setErrorMessage('Inicio de sesión con Google no disponible en este momento.');
      }
    } catch (err: any) {
      console.warn('Google sign in error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Se canceló la ventana de Google.');
      } else {
        setErrorMessage('No se pudo conectar con Google. Puedes registrarte con correo y contraseña.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="auth-modal-dialog"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* Header with gradient banner */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <button
            id="auth-modal-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/90 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {mode === 'register' ? 'Registrarse en la App' : 'Iniciar Sesión'}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Control de Vencimientos Compartido
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex mt-4 p-1 bg-black/20 rounded-xl">
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registrarse
            </button>
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Iniciar Sesión
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 flex items-start gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre o Apodo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-input-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej: Ángel, Cocina, etc."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Aparecerá en los productos que agregues para que todos sepan quién los cargó.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear Mi Cuenta
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Ingresar a Mi Cuenta
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-semibold">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
                O también
              </span>
            </div>
          </div>

          {/* Google Button */}
          <button
            id="auth-google-btn"
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continuar con Google
          </button>

          {/* Continue as Guest option */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              id="auth-skip-btn"
              type="button"
              onClick={onClose}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline transition-colors"
            >
              Continuar sin registrarme (Acceso Libre)
            </button>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Cualquiera con el link puede ver y cargar productos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
