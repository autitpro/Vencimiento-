import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Search, 
  Plus, 
  Sparkles,
  ShoppingBag,
  Clock,
  Camera,
  Cloud,
  CloudOff,
  Trash2,
  UserPlus,
  LogIn,
  LogOut,
  User,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { ProductItem, UserProfile, calculateDaysRemaining } from './types';
import { ProductForm } from './components/ProductForm';
import { ProductCard } from './components/ProductCard';
import { AlertBanner } from './components/AlertBanner';
import { StartupAlertModal } from './components/StartupAlertModal';
import { AuthModal } from './components/AuthModal';
import { db, auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  enableNetwork
} from 'firebase/firestore';

type FilterTab = 'all' | 'expiring' | 'expired' | 'safe' | 'consumed';
export type SyncStatus = 'connected' | 'syncing' | 'offline' | 'error';

export default function App() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [syncErrorDetail, setSyncErrorDetail] = useState<string | null>(null);

  // User session state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('vencimientos_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'register' | 'login'>('register');

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(true);

  // Listen to Firebase auth changes
  useEffect(() => {
    if (!auth) return;
    try {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          const profile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
            photoURL: user.photoURL || undefined
          };
          setCurrentUser(profile);
          localStorage.setItem('vencimientos_user_session', JSON.stringify(profile));
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Auth state listener error:', e);
    }
  }, []);

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setCurrentUser(null);
    localStorage.removeItem('vencimientos_user_session');
  };

  // Real-time Firestore sync with offline persistence and transparent status
  useEffect(() => {
    if (!db) {
      setSyncStatus('error');
      setSyncErrorDetail('No se pudo inicializar Cloud Firestore');
      setIsLoading(false);
      return;
    }

    const handleBrowserOnline = () => {
      setSyncStatus((prev) => (prev === 'offline' ? 'syncing' : prev));
      enableNetwork(db).catch(() => {});
    };

    const handleBrowserOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    try {
      const q = collection(db, 'products');
      // includeMetadataChanges: true allows tracking when mutations are pending sync vs confirmed by Cloud Firestore
      const unsubscribe = onSnapshot(
        q, 
        { includeMetadataChanges: true },
        (snapshot) => {
          const items: ProductItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              name: data.name || '',
              imageUrl: data.imageUrl || '',
              expiryDate: data.expiryDate || '',
              category: data.category || '',
              notes: data.notes || '',
              createdAt: data.createdAt || new Date().toISOString(),
              isConsumed: !!data.isConsumed,
              createdBy: data.createdBy || undefined
            });
          });

          // Sort descending by creation date
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProducts(items);
          setIsLoading(false);
          setSyncErrorDetail(null);

          // Determine accurate sync state from metadata
          const hasPendingWrites = snapshot.metadata.hasPendingWrites;
          const fromCache = snapshot.metadata.fromCache;

          if (!navigator.onLine) {
            setSyncStatus('offline');
          } else if (hasPendingWrites) {
            setSyncStatus('syncing');
          } else if (fromCache) {
            // Still fetching latest delta from cloud
            setSyncStatus('syncing');
          } else {
            // Confirmed live from Cloud Firestore backend
            setSyncStatus('connected');
          }
        }, 
        (error) => {
          console.warn('Firestore snapshot error:', error);
          setIsLoading(false);
          if (!navigator.onLine) {
            setSyncStatus('offline');
          } else {
            setSyncStatus('error');
            setSyncErrorDetail(error.message);
          }
        }
      );

      return () => {
        unsubscribe();
        window.removeEventListener('online', handleBrowserOnline);
        window.removeEventListener('offline', handleBrowserOffline);
      };
    } catch (e: any) {
      console.error('Error connecting to Firestore:', e);
      setIsLoading(false);
      setSyncStatus('error');
      setSyncErrorDetail(e?.message || 'Error de conexión');
    }
  }, []);

  // Helper to remove any undefined keys before sending to Firestore
  const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = value;
      }
    }
    return clean as Partial<T>;
  };

  // Handlers with genuine Cloud Firestore operations
  const handleAddProduct = async (newProd: Omit<ProductItem, 'id' | 'createdAt' | 'isConsumed'>): Promise<string> => {
    if (!db) {
      throw new Error('Base de datos no inicializada. Verifica la conexión.');
    }

    // Direct write to Cloud Firestore with sanitized fields (Firestore rejects undefined fields)
    const rawData = {
      ...newProd,
      createdAt: new Date().toISOString(),
      isConsumed: false
    };

    const docRef = await addDoc(collection(db, 'products'), sanitizeForFirestore(rawData));

    return docRef.id;
  };

  const handleToggleConsumed = async (id: string) => {
    if (!db) {
      throw new Error('Base de datos no inicializada.');
    }
    const product = products.find(p => p.id === id);
    if (!product) return;

    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      isConsumed: !product.isConsumed
    });
  };

  const handleDelete = async (id: string) => {
    if (!id || typeof id !== 'string') {
      throw new Error('ID de producto no válido para eliminar.');
    }

    if (!db) {
      throw new Error('Base de datos no disponible.');
    }

    try {
      const docRef = doc(db, 'products', id);
      await deleteDoc(docRef);
      // Inmediatamente eliminamos el producto de la lista local para respuesta visual instantánea
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      console.error('Error al eliminar producto en Cloud Firestore:', err);
      throw new Error(err?.message || 'Error al eliminar el documento en Cloud Firestore');
    }
  };

  const handleUpdateExpiryDate = async (id: string, newDate: string) => {
    if (!db) {
      throw new Error('Base de datos no inicializada.');
    }

    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      expiryDate: newDate
    });
  };

  // Metrics
  const activeProducts = products.filter((p) => !p.isConsumed);
  const expiringSoonCount = activeProducts.filter((p) => {
    const d = calculateDaysRemaining(p.expiryDate);
    return d >= 0 && d <= 10;
  }).length;

  const expiredCount = activeProducts.filter((p) => {
    const d = calculateDaysRemaining(p.expiryDate);
    return d < 0;
  }).length;

  const safeCount = activeProducts.filter((p) => {
    const d = calculateDaysRemaining(p.expiryDate);
    return d > 10;
  }).length;

  const consumedCount = products.filter((p) => p.isConsumed).length;

  const handleClearAll = async () => {
    const password = window.prompt('Ingresa la clave para borrar todos los productos:');
    if (password !== 'millansa') {
      if (password !== null) {
        alert('Clave incorrecta. Operación cancelada.');
      }
      return;
    }

    if (window.confirm('¿Deseas confirmar que deseas borrar todos los productos registrados?')) {
      try {
        const deletePromises = products.map((p) => deleteDoc(doc(db, 'products', p.id)));
        await Promise.all(deletePromises);
      } catch (e) {
        console.error('Error clearing products:', e);
        alert('Error al borrar los productos.');
      }
    }
  };

  // Filtered List
  const filteredProducts = products.filter((p) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCategory = p.category?.toLowerCase().includes(q);
      if (!matchName && !matchCategory) return false;
    }

    const days = calculateDaysRemaining(p.expiryDate);

    if (activeFilter === 'consumed') {
      return !!p.isConsumed;
    }

    if (p.isConsumed) {
      return activeFilter === 'all';
    }

    if (activeFilter === 'expiring') {
      return days >= 0 && days <= 10;
    }
    if (activeFilter === 'expired') {
      return days < 0;
    }
    if (activeFilter === 'safe') {
      return days > 10;
    }

    return true;
  });

  // Sort by nearest expiry first
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.isConsumed && !b.isConsumed) return 1;
    if (!a.isConsumed && b.isConsumed) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* STARTUP PROMINENT NOTIFICATION MODAL */}
      <StartupAlertModal
        products={products}
        onViewExpiring={() => setActiveFilter('expiring')}
        onViewExpired={() => setActiveFilter('expired')}
      />

      {/* APP TOP HEADER */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  Control de Vencimientos
                </h1>

                {/* Clear 4-state synchronization indicator */}
                {syncStatus === 'connected' && (
                  <span
                    id="sync-status-connected"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    title="Conectado a Cloud Firestore. Los cambios se sincronizan en tiempo real."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Conectado
                  </span>
                )}

                {syncStatus === 'syncing' && (
                  <span
                    id="sync-status-syncing"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
                    title="Sincronizando datos con Cloud Firestore..."
                  >
                    <RefreshCw className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin" />
                    Sincronizando...
                  </span>
                )}

                {syncStatus === 'offline' && (
                  <span
                    id="sync-status-offline"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                    title="Sin conexión a Internet. Operando en modo local (los datos se sincronizarán al reconectar)."
                  >
                    <CloudOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    Sin conexión
                  </span>
                )}

                {syncStatus === 'error' && (
                  <span
                    id="sync-status-error"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                    title={syncErrorDetail || 'Error de comunicación con Cloud Firestore'}
                  >
                    <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    Error de conexión
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sincronizado en tiempo real con Cloud Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left mr-1">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight truncate max-w-[120px]">
                    {currentUser.email}
                  </div>
                </div>
                <button
                  id="header-logout-btn"
                  type="button"
                  onClick={handleLogout}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="header-register-btn"
                  type="button"
                  onClick={() => {
                    setAuthInitialMode('register');
                    setShowAuthModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-all"
                  title="Crear una cuenta"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Registrarse</span>
                </button>

                <button
                  id="header-login-btn"
                  type="button"
                  onClick={() => {
                    setAuthInitialMode('login');
                    setShowAuthModal(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition"
                  title="Iniciar sesión"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ingresar</span>
                </button>
              </div>
            )}

            {products.length > 0 && (
              <button
                id="clear-all-btn"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition"
                title="Borrar todos los productos con un clic"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Borrar todo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* NETWORK / SYNC STATUS BANNER */}
        {syncStatus === 'offline' && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Modo sin conexión:</span> Las acciones que realices se guardarán de forma segura en tu dispositivo y se sincronizarán con Cloud Firestore automáticamente al recuperar internet.
              </div>
            </div>
          </div>
        )}

        {syncStatus === 'error' && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Problema de conexión con Cloud Firestore:</span> {syncErrorDetail || 'No se pudo comunicar con el servidor.'}
              </div>
            </div>
            <button
              onClick={() => {
                if (db) {
                  setSyncStatus('syncing');
                  enableNetwork(db).catch((e) => {
                    setSyncStatus('error');
                    setSyncErrorDetail(e?.message || 'Fallo al reconectar');
                  });
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* PROMINENT 10-DAY ALERT BANNER */}
        <AlertBanner
          products={products}
          onFilterExpiring={() => setActiveFilter(activeFilter === 'expiring' ? 'all' : 'expiring')}
          activeFilter={activeFilter}
        />

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button
            id="stat-card-all"
            onClick={() => setActiveFilter('all')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeFilter === 'all'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Productos</div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {products.length}
            </div>
          </button>

          <button
            id="stat-card-expiring"
            onClick={() => setActiveFilter('expiring')}
            className={`p-3.5 rounded-2xl border text-left transition relative overflow-hidden ${
              activeFilter === 'expiring'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 ring-2 ring-amber-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Por vencer (≤ 10d)
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {expiringSoonCount}
            </div>
          </button>

          <button
            id="stat-card-expired"
            onClick={() => setActiveFilter('expired')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeFilter === 'expired'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
            }`}
          >
            <div className="text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Vencidos
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {expiredCount}
            </div>
          </button>

          <button
            id="stat-card-safe"
            onClick={() => setActiveFilter('safe')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeFilter === 'safe'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
            }`}
          >
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Al día (&gt; 10d)
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {safeCount}
            </div>
          </button>
        </div>

        {/* PRODUCT ENTRY FORM */}
        <ProductForm 
          onAddProduct={handleAddProduct} 
          currentUser={currentUser}
          onOpenAuth={() => {
            setAuthInitialMode('register');
            setShowAuthModal(true);
          }}
        />

        {/* PRODUCTS SECTION HEADER & FILTERS */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Mis Productos Registrados
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {sortedProducts.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ordenados por fecha de vencimiento más próxima
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-products-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              id="filter-tab-all"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              Todos ({products.length})
            </button>

            <button
              id="filter-tab-expiring"
              onClick={() => setActiveFilter('expiring')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'expiring'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/80 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Por vencer ≤ 10d ({expiringSoonCount})
            </button>

            <button
              id="filter-tab-expired"
              onClick={() => setActiveFilter('expired')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'expired'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/80 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Vencidos ({expiredCount})
            </button>

            <button
              id="filter-tab-safe"
              onClick={() => setActiveFilter('safe')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === 'safe'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Al día ({safeCount})
            </button>

            <button
              id="filter-tab-consumed"
              onClick={() => setActiveFilter('consumed')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
                activeFilter === 'consumed'
                  ? 'bg-slate-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              Consumidos ({consumedCount})
            </button>
          </div>

          {/* PRODUCTS GRID */}
          {sortedProducts.length === 0 ? (
            <div
              id="empty-products-state"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No hay productos en esta categoría
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No se encontraron productos que coincidan con "${searchQuery}".`
                  : 'Agrega un nuevo producto arriba con su foto y fecha de vencimiento.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div
              id="products-grid-container"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onToggleConsumed={handleToggleConsumed}
                  onDelete={handleDelete}
                  onUpdateExpiryDate={handleUpdateExpiryDate}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400 mt-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>Control de Vencimientos</strong> • Alertas a 10 días con Foto y Fecha
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <Cloud className="w-3.5 h-3.5" />
            Guardado en base de datos en la nube accesible para todos
          </span>
        </div>
      </footer>
      {/* AUTH MODAL */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => setCurrentUser(user)}
        initialMode={authInitialMode}
      />
    </div>
  );
}
