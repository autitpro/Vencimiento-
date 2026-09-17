import React from 'react';
import { AlertTriangle, Bell, CheckCircle2, ChevronRight } from 'lucide-react';
import { ProductItem, calculateDaysRemaining, formatSpanishDate } from '../types';

interface AlertBannerProps {
  products: ProductItem[];
  onFilterExpiring: () => void;
  activeFilter: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  products,
  onFilterExpiring,
  activeFilter
}) => {
  const activeProducts = products.filter((p) => !p.isConsumed);

  const expiringSoonProducts = activeProducts.filter((p) => {
    const days = calculateDaysRemaining(p.expiryDate);
    return days >= 0 && days <= 10;
  });

  const expiredProducts = activeProducts.filter((p) => {
    const days = calculateDaysRemaining(p.expiryDate);
    return days < 0;
  });

  if (expiringSoonProducts.length === 0 && expiredProducts.length === 0) {
    return (
      <div
        id="all-clear-banner"
        className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 text-emerald-900 dark:text-emerald-200 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold">¡Todo en orden!</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
              No tienes ningún producto por vencer en los próximos 10 días.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="main-alert-banner"
      className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 sm:p-5 shadow-sm text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/80 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0 animate-pulse">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold">
              {expiringSoonProducts.length > 0 ? (
                <>
                  ⚠️ ¡Atención! Tienes {expiringSoonProducts.length}{' '}
                  {expiringSoonProducts.length === 1 ? 'producto' : 'productos'} por vencer en ≤ 10 días
                </>
              ) : (
                <>❌ Tienes {expiredProducts.length} productos vencidos</>
              )}
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
              Aviso a 10 días
            </span>
          </div>

          <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-1 max-w-2xl">
            {expiringSoonProducts.length > 0 && (
              <>
                Productos más próximos a vencer:{' '}
                <strong className="underline">
                  {expiringSoonProducts.map((p) => `${p.name} (en ${calculateDaysRemaining(p.expiryDate)}d)`).join(', ')}
                </strong>
                . Te recomendamos consumirlos pronto para evitar desperdicios.
              </>
            )}
            {expiredProducts.length > 0 && (
              <span className="block mt-0.5 text-rose-700 dark:text-rose-300 font-medium">
                {expiredProducts.length} {expiredProducts.length === 1 ? 'producto ya venció' : 'productos ya vencieron'}.
              </span>
            )}
          </p>
        </div>
      </div>

      <button
        id="view-expiring-soon-btn"
        onClick={onFilterExpiring}
        className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
          activeFilter === 'expiring'
            ? 'bg-amber-600 text-white'
            : 'bg-amber-200/80 hover:bg-amber-300/80 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100'
        }`}
      >
        <span>Filtrar alertas ({expiringSoonProducts.length})</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
