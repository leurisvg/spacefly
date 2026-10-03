/** Lower-case and strip accents so "cafe" finds "Café". */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
