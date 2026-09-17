export interface ProductItem {
  id: string;
  name: string;
  imageUrl: string;
  expiryDate: string; // YYYY-MM-DD
  category?: string;
  notes?: string;
  createdAt: string;
  isConsumed?: boolean;
  createdBy?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt?: string;
}

export type ProductStatusType = 'expired' | 'expiring_soon' | 'safe' | 'consumed';

export interface ExpirationStatus {
  type: ProductStatusType;
  daysRemaining: number;
  badgeLabel: string;
  badgeColor: string;
  messageTitle: string;
  messageDescription: string;
  isAlert10Days: boolean;
}

/**
 * Calculates remaining days until expiry relative to today's date (local midnight)
 */
export function calculateDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = expiryDateStr.split('-').map(Number);
  const expiry = new Date(year, month - 1, day);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats a YYYY-MM-DD string into readable Spanish format (e.g., "15 de mayo de 2026")
 */
export function formatSpanishDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Generates the status and specific 10-day alert explanation message
 */
export function getProductExpirationStatus(product: ProductItem, alertThreshold = 10): ExpirationStatus {
  if (product.isConsumed) {
    return {
      type: 'consumed',
      daysRemaining: 0,
      badgeLabel: 'Consumido',
      badgeColor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
      messageTitle: 'Producto ya consumido',
      messageDescription: 'Este producto ya fue consumido o retirado.',
      isAlert10Days: false
    };
  }

  const days = calculateDaysRemaining(product.expiryDate);
  const formattedDate = formatSpanishDate(product.expiryDate);

  if (days < 0) {
    const pastDays = Math.abs(days);
    return {
      type: 'expired',
      daysRemaining: days,
      badgeLabel: `Venció hace ${pastDays} ${pastDays === 1 ? 'día' : 'días'}`,
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      messageTitle: '❌ ¡Producto vencido!',
      messageDescription: `Este producto venció el ${formattedDate} (hace ${pastDays} ${pastDays === 1 ? 'día' : 'días'}). Se aconseja no consumirlo para evitar riesgos.`,
      isAlert10Days: true
    };
  }

  if (days <= alertThreshold) {
    return {
      type: 'expiring_soon',
      daysRemaining: days,
      badgeLabel: days === 0 ? '¡Vence hoy!' : days === 1 ? '¡Vence mañana!' : `Vence en ${days} días`,
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      messageTitle: '⚠️ ¡Atención! Se te está por vencer este producto',
      messageDescription: `Este producto vence el ${formattedDate} (${days === 0 ? 'hoy mismo' : days === 1 ? 'mañana' : `faltan solo ${days} días`}). Consúmelo, utilízalo o congélalo pronto para evitar que se eche a perder.`,
      isAlert10Days: true
    };
  }

  return {
    type: 'safe',
    daysRemaining: days,
    badgeLabel: `Vence en ${days} días`,
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    messageTitle: '✅ En buen estado',
    messageDescription: `El producto vence el ${formattedDate} (dentro de ${days} días). Tienes tiempo suficiente para consumirlo.`,
    isAlert10Days: false
  };
}
