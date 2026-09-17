import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, X, ChevronRight, Clock, ShieldAlert } from 'lucide-react';
import { ProductItem, calculateDaysRemaining } from '../types';

interface StartupAlertModalProps {
  products: ProductItem[];
  onViewExpiring: () => void;
  onViewExpired: () => void;
}

export const StartupAlertModal: React.FC<StartupAlertModalProps> = ({
  products,
  onViewExpiring,
  onViewExpired
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeProducts = products.filter((p) => !p.isConsumed);

  const expiredProducts = activeProducts.filter((p) => calculateDaysRemaining(p.expiryDate) < 0);
  const expiringSoonProducts = activeProducts.filter((p) => {
    const days = calculateDaysRemaining(p.expiryDate);
    return days >= 0 && days <= 10;
  });

  const totalAlerts = expiredProducts.length + expiringSoonProducts.length;

  useEffect(() => {
    // Show on initial load if there are critical items and not already dismissed this session
    if (totalAlerts > 0) {
      const dismissed = sessionStorage.getItem('startup_alert_dismissed_v1');
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [products.length]); // Check when products load

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('startup_alert_dismissed_v1', 'true');
  };

  if (!isOpen || totalAlerts === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        id="startup-alert-modal"
        className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden p-6 relative animate-scale-up"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-inner animate-bounce">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Alerta de Vencimiento
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              ¡Atención al Cargar la App!
            </h3>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Hemos detectado <strong className="text-amber-600 dark:text-amber-400 font-bold">{totalAlerts} productos</strong> que requieren tu atención inmediata al estar próximos a vencer o vencidos.
        </p>

        {/* Summary Badges */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {expiredProducts.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-300 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-rose-700 dark:text-rose-400">
                  {expiredProducts.length}
                </div>
                <div className="text-xs font-medium text-rose-600 dark:text-rose-300">
                  Vencidos
                </div>
              </div>
            </div>
          )}

          {expiringSoonProducts.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {expiringSoonProducts.length}
                </div>
                <div className="text-xs font-medium text-amber-600 dark:text-amber-300">
                  Vencen en ≤ 10 días
                </div>
              </div>
            </div>
          )}
        </div>

        {/* List of critical items */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 mb-6 max-h-40 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Productos críticos:
          </div>
          {[...expiredProducts, ...expiringSoonProducts].slice(0, 5).map((p) => {
            const days = calculateDaysRemaining(p.expiryDate);
            const isExp = days < 0;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0">
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 truncate">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">📦</span>
                  )}
                  <span className="truncate">{p.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                  isExp 
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {isExp ? `Vencido hace ${Math.abs(days)}d` : `Vence en ${days}d`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              handleClose();
              onViewExpiring();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition"
          >
            <span>Ver productos afectados</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
