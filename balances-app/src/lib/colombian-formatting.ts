/**
 * Colombian localization and formatting utilities
 */

/**
 * Formats currency amount in Colombian Peso format
 * Uses period as thousands separator (e.g., $190.000)
 */
export function formatColombianCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CO', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

/**
 * Formats date in Colombian DD/MM/YYYY format
 */
export function formatColombianDate(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
}

/**
 * Formats time in HH:mm format
 */
export function formatColombianTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Formats datetime in Colombian format
 */
export function formatColombianDateTime(date: Date): string {
  return `${formatColombianDate(date)} ${formatColombianTime(date)}`;
}

/**
 * Period labels in Spanish for analytics cards
 */
export const PERIOD_LABELS = {
  daily: 'Hoy',
  weekly: 'Esta Semana', 
  monthly: 'Este Mes',
  average: 'Promedio'
} as const;

/**
 * Status labels in Spanish
 */
export const STATUS_LABELS = {
  processed: 'Procesado',
  failed: 'Fallido',
  duplicate: 'Duplicado'
} as const;

/**
 * Common Colombian transaction terms
 */
export const TRANSACTION_TERMS = {
  deposit: 'Depósito',
  transfer: 'Transferencia',
  consignation: 'Consignación',
  totalAmount: 'Monto Total',
  transactionCount: 'Número de Transacciones',
  averageAmount: 'Promedio por Transacción',
  senderName: 'Remitente',
  accountNumber: 'Cuenta'
} as const;