/**
 * Reads what a person types as a time: `9`, `930`, `9:30`, `0930`, `21.05`. Returns `HH:mm` (24 hours)
 * or `null` when it isn't a time.
 */
export function parseTime(input: string): string | null {
  const m = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(input.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
