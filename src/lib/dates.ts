/** Manipulação de datas ISO YYYY-MM-DD (meio-dia local evita deslocamento de fuso) */

export function subDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00`).getTime();
  const b = new Date(`${end}T12:00:00`).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

/** Últimos 30 dias inclusive (hoje e 29 dias anteriores) */
export function defaultLast30Period(todayStr: string): { start: string; end: string } {
  return { start: subDaysIso(todayStr, 29), end: todayStr };
}

/** Dias até uma data futura (0 = hoje); negativo se já passou */
export function daysUntil(fromIso: string, targetIso: string): number {
  const a = new Date(`${fromIso}T12:00:00`).getTime();
  const b = new Date(`${targetIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}
