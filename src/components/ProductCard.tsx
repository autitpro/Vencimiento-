import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  Check, 
  AlertCircle, 
  Edit3, 
  RotateCcw,
  Sparkles,
  Loader2,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProductItem, getProductExpirationStatus, formatSpanishDate } from '../types';

interface ProductCardProps {
  product: ProductItem;
  onToggleConsumed: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onUpdateExpiryDate: (id: string, newDate: string) => Promise<void> | void;
  onSearchGrounding?: (productName: string, category?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onToggleConsumed,
  onDelete,
  onUpdateExpiryDate,
  onSearchGrounding
}) => {
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editedDate, setEditedDate] = useState(product.expiryDate);
  const [isUpdatingConsumed, setIsUpdatingConsumed] = useState(false);
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const status = getProductExpirationStatus(product);

  const handleMarkConsumed = async () => {
    if (isUpdatingConsumed) return;
    setIsUpdatingConsumed(true);
    setCardError(null);
    try {
      await onToggleConsumed(product.id);
      if (!product.isConsumed) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 }
          });
        } catch {
          // ignore confetti error
        }
      }
    } catch (err: any) {
      setCardError('Error al actualizar en Firestore');
    } finally {
      setIsUpdatingConsumed(false);
    }
  };

  const handleSaveDate = async () => {
    if (!editedDate || isSavingDate) return;
    setIsSavingDate(true);
    setCardError(null);
    try {
      await onUpdateExpiryDate(product.id, editedDate);
      setIsEditingDate(false);
    } catch (err: any) {
      setCardError('Error al guardar fecha en Firestore');
    } finally {
      setIsSavingDate(false);
    }
  };

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    setCardError(null);
    setIsDeleting(true);
    try {
      await onDelete(product.id);
    } catch (err: any) {
      setCardError(err?.message || 'Error al eliminar producto');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      className={`rounded-2xl border transition-all overflow-hidden flex flex-col ${
        product.isConsumed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
          : status.type === 'expired'
          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
          : status.type === 'expiring_soon'
          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 shadow-sm ring-1 ring-amber-400/30'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
      }`}
    >
      {/* CARD IMAGE & BADGE HEADER */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            product.isConsumed ? 'grayscale' : 'hover:scale-105'
          }`}
          loading="lazy"
        />

        {/* Top Floating Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shadow-xs backdrop-blur-xs ${status.badgeColor}`}
          >
            {status.type === 'expiring_soon' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />}
            {status.type === 'expired' && <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
            {status.type === 'safe' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            {status.badgeLabel}
          </span>
        </div>

        {/* Category Pill */}
        {product.category && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium tracking-wide uppercase">
              {product.category}
            </span>
          </div>
        )}
      </div>

      {/* CARD BODY */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Product Name */}
          <h3
            className={`text-base font-bold line-clamp-1 ${
              product.isConsumed
                ? 'line-through text-slate-500 dark:text-slate-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {product.name}
          </h3>

          {product.createdBy && (
            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Cargado por: <span className="text-slate-600 dark:text-slate-300 font-semibold">{product.createdBy}</span>
            </p>
          )}

          {/* Expiration Date Info / Date Editor */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Vencimiento:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {formatSpanishDate(product.expiryDate)}
              </strong>
            </div>

            <div className="flex items-center gap-1">
              {onSearchGrounding && (
                <button
                  id={`google-tips-btn-${product.id}`}
                  type="button"
                  onClick={() => onSearchGrounding(product.name, product.category)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 text-[10px] font-semibold border border-blue-200 dark:border-blue-800 transition"
                  title="Consultar conservación y caducidad en Google Search"
                >
                  <Search className="w-3 h-3 text-blue-500" />
                  <span>Google Tips</span>
                </button>
              )}
              <button
                id={`edit-date-btn-${product.id}`}
                onClick={() => setIsEditingDate(!isEditingDate)}
                className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition p-1"
                title="Cambiar fecha de vencimiento"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline Date Editor */}
          {isEditingDate && (
            <div className="mt-2.5 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center gap-2">
              <input
                type="date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <button
                onClick={handleSaveDate}
                disabled={isSavingDate}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 inline-flex items-center gap-1"
              >
                {isSavingDate && <Loader2 className="w-3 h-3 animate-spin" />}
                Guardar
              </button>
              <button
                onClick={() => setIsEditingDate(false)}
                disabled={isSavingDate}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancelar
              </button>
            </div>
          )}

          {cardError && (
            <div className="mt-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{cardError}</span>
            </div>
          )}

          {/* Optional notes */}
          {product.notes && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic">
              "{product.notes}"
            </p>
          )}

          {/* THE 10-DAY ALERT MESSAGE EXPLANATION (CRITICAL USER REQUIREMENT) */}
          <div className="mt-3">
            {status.type === 'expiring_soon' && (
              <div
                id={`alert-message-10days-${product.id}`}
                className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-200 text-xs shadow-xs"
              >
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>¡Se te está por vencer este producto!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                  {status.daysRemaining === 0
                    ? `⚠️ Este producto vence hoy (${formatSpanishDate(product.expiryDate)}). ¡Consúmelo hoy mismo!`
                    : status.daysRemaining === 1
                    ? `⚠️ Vence mañana (${formatSpanishDate(product.expiryDate)}). Te recomendamos consumirlo o cocinarlo en las próximas horas.`
                    : `⚠️ Vence en ${status.daysRemaining} días (${formatSpanishDate(product.expiryDate)}). Consúmelo o prepáralo pronto antes de que caduque.`}
                </p>
              </div>
            )}

            {status.type === 'expired' && (
              <div
                id={`alert-message-expired-${product.id}`}
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/80 text-rose-950 dark:text-rose-200 text-xs"
              >
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 mb-1">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Producto Vencido</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800/90 dark:text-rose-200/90">
                  Venció el {formatSpanishDate(product.expiryDate)}. Revisa su estado antes de consumirlo.
                </p>
              </div>
            )}

            {status.type === 'safe' && (
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-300 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Al día: Faltan {status.daysRemaining} días para su vencimiento.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD ACTIONS */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* Mark as consumed button */}
          <button
            id={`mark-consumed-btn-${product.id}`}
            onClick={handleMarkConsumed}
            disabled={isUpdatingConsumed || isDeleting}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-50 ${
              product.isConsumed
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {isUpdatingConsumed ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Actualizando...
              </>
            ) : product.isConsumed ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Desmarcar
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Marcar Consumido
              </>
            )}
          </button>

          {/* Delete button */}
          <button
            id={`delete-product-btn-${product.id}`}
            onClick={handleDeleteClick}
            disabled={isDeleting || isUpdatingConsumed}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
            title="Eliminar producto"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
