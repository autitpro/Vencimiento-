import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Calendar, 
  ExternalLink, 
  ShieldAlert, 
  Thermometer, 
  CheckCircle2, 
  Loader2, 
  Info,
  ArrowRight
} from 'lucide-react';
import { ShelfLifeInsight } from '../types';

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialCategory?: string;
  onApplySuggestedDate?: (suggestedDate: string) => void;
}

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  initialCategory = '',
  onApplySuggestedDate,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShelfLifeInsight | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync initial query when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery);
        handleSearch(initialQuery, initialCategory);
      } else {
        setResult(null);
        setError(null);
      }
    }
  }, [isOpen, initialQuery, initialCategory]);

  if (!isOpen) return null;

  const handleSearch = async (searchName = query, searchCat = category) => {
    const trimmed = searchName.trim();
    if (!trimmed) {
      setError('Por favor ingresa el nombre de un alimento o producto.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/search-shelf-life', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: trimmed, category: searchCat }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
      }

      const data: ShelfLifeInsight = await response.json();
      setResult(data);
    } catch (err: any) {
      console.warn('Search grounding client error:', err);
      setError('No se pudo completar la búsqueda en este momento. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedDateStr = (days: number = 7) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    return target.toISOString().split('T')[0];
  };

  const quickPills = [
    { name: 'Leche pasteurizada', cat: 'Lácteos' },
    { name: 'Yogur bebible', cat: 'Lácteos' },
    { name: 'Queso fresco', cat: 'Lácteos' },
    { name: 'Carne vacuna picada', cat: 'Carnes' },
    { name: 'Pechuga de pollo', cat: 'Carnes' },
    { name: 'Huevos de campo', cat: 'Almacén' },
    { name: 'Atún en lata abierto', cat: 'Almacén' },
  ];

  return (
    <div
      id="search-grounding-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="search-grounding-dialog"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header with Google Search Grounding badge */}
        <div className="relative px-6 py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Consulta de Caducidad Inteligente
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Google Search
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Información verificada y actualizada en tiempo real vía Google Search y Gemini
              </p>
            </div>
          </div>

          <button
            id="close-search-grounding-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="grounding-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. Yogur natural, Queso cremoso, Pollo crudo, Jarabe..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              id="grounding-search-submit"
              type="submit"
              disabled={loading || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Investigar</span>
                </>
              )}
            </button>
          </form>

          {/* Quick pills */}
          {!result && !loading && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                Sugerencias populares:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickPills.map((pill) => (
                  <button
                    key={pill.name}
                    type="button"
                    onClick={() => {
                      setQuery(pill.name);
                      setCategory(pill.cat);
                      handleSearch(pill.name, pill.cat);
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
                  >
                    {pill.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Consultando fuentes en Google Search...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Analizando pautas de seguridad alimentaria y tiempos de conservación recomendados para "{query}".
              </p>
            </div>
          )}

          {/* Result Card */}
          {result && !loading && (
            <div className="space-y-4 animate-fade-in">
              {/* Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 border border-blue-200/80 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-blue-600 text-white">
                      Vida Útil Estimada
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {result.productName}
                    </span>
                  </div>

                  {result.suggestedDays && onApplySuggestedDate && (
                    <button
                      id="apply-suggested-date-btn"
                      type="button"
                      onClick={() => {
                        const dateStr = getSuggestedDateStr(result.suggestedDays);
                        onApplySuggestedDate(dateStr);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Usar fecha sugerida (+{result.suggestedDays} días)</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {result.summary}
                </div>
              </div>

              {/* Grid: Storage Tips & Spoilage Signs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                    <Thermometer className="w-4 h-4 text-sky-500" />
                    <span>Pautas de Conservación</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {result.storageRecommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <span>Señales de Vencimiento</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {result.spoilageSigns.map((sign, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Grounding Sources (Google Search) */}
              {result.groundingSources && result.groundingSources.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                      <span>Fuentes de Google Search consultadas:</span>
                    </div>
                    {result.isFallback && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        Guía estándar
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {result.groundingSources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 hover:underline transition"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="max-w-[200px] truncate">{source.title || source.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Los datos de conservación son informativos según estándares de seguridad.</span>
          </div>

          <button
            id="close-search-grounding-footer-btn"
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
