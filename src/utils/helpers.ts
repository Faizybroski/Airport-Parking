import crypto from 'crypto';

/**
 * Generate a unique tracking number: PPK-XXXXXX
 */
export const generateTrackingNumber = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'PPK-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(chars.length));
  }
  return result;
};

/**
 * Calculate hours between two dates
 */
export const calculateHours = (start: Date, end: Date): number => {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
};

/**
 * Convert hours to days (float)
 */
export const hoursToDays = (hours: number): number => {
  return hours / 24;
};

/**
 * Format duration to readable string
 */
export const formatDuration = (hours: number): string => {
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (days === 0) return `${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
};

/**
 * Format currency (GBP)
 */
export const formatPrice = (price: number): string => {
  return `£${price.toFixed(2)}`;
};
