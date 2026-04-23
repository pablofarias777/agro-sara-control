/** Format number as BRL currency */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Format date string YYYY-MM-DD to DD/MM/YYYY */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/** "YYYY-MM" → "março de 2025" */
export function formatMonthYearPt(yearMonth: string): string {
  const parts = yearMonth.split("-");
  if (parts.length < 2) return yearMonth;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!y || !m) return yearMonth;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Get today as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse user decimal input (comma or dot) */
export function parseDecimalInput(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

/** Quantidade para exibição (pt-BR, até 4 decimais) */
export function formatQuantidade(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}
