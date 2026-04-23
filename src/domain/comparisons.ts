import type { Despesa, Safra, Venda } from "./types";
import { filterByDateRange, sumFinanceiro } from "./finance";

function toLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Período imediatamente anterior ao intervalo [inicio, fim], com a mesma quantidade de dias (inclusive). */
export function previousPeriodRange(inicio: string, fim: string): { inicio: string; fim: string } | null {
  const [y0, m0, d0] = inicio.split("-").map(Number);
  const [y1, m1, d1] = fim.split("-").map(Number);
  const start = new Date(y0, m0 - 1, d0);
  const end = new Date(y1, m1 - 1, d1);
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (dayCount < 1 || inicio > fim) return null;
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (dayCount - 1) * 86400000);
  return {
    inicio: toLocalIsoDate(prevStart),
    fim: toLocalIsoDate(prevEnd),
  };
}

/** Primeiro e último dia do mês civil AAAA-MM */
export function rangeMesCalendario(anoMes: string): { inicio: string; fim: string } {
  const [y, m] = anoMes.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    inicio: `${y}-${String(m).padStart(2, "0")}-01`,
    fim: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Mês civil anterior a AAAA-MM */
export function mesAnterior(anoMes: string): string {
  const [y, m] = anoMes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface ResumoCulturaPeriodo {
  despesas: number;
  vendas: number;
  saldo: number;
}

export function resumoFinanceiroCultura(
  culturaId: string,
  despesas: Despesa[],
  vendas: Venda[]
): ResumoCulturaPeriodo {
  const d = despesas.filter((x) => x.culturaId === culturaId).reduce((s, x) => s + x.valor, 0);
  const v = vendas.filter((x) => x.culturaId === culturaId).reduce((s, x) => s + x.valorTotal, 0);
  return { despesas: d, vendas: v, saldo: v - d };
}

/** Safras de uma cultura, início mais recente primeiro */
export function safrasOrdenadasPorDataInicio(safras: Safra[], culturaId: string): Safra[] {
  return safras.filter((s) => s.culturaId === culturaId).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
}

/** Duas safras mais recentes da cultura, ou null se não houver duas */
export function duasSafrasMaisRecentes(safras: Safra[], culturaId: string): [Safra, Safra] | null {
  const list = safrasOrdenadasPorDataInicio(safras, culturaId);
  if (list.length < 2) return null;
  return [list[0], list[1]];
}

export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function totaisNoPeriodo(
  despesas: Despesa[],
  vendas: Venda[],
  inicio: string,
  fim: string
) {
  const fd = filterByDateRange(despesas, inicio, fim);
  const fv = filterByDateRange(vendas, inicio, fim);
  return sumFinanceiro(fd, fv);
}
