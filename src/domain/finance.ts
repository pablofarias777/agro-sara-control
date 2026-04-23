import { CANAL_LABELS, CENTRO_CUSTO_LABELS, CENTRO_CUSTO_ORDER } from "./labels";
import type {
  CanalVenda,
  CategoriaDespesa,
  CentroCustoDespesa,
  Cultura,
  Despesa,
  Safra,
  Venda,
} from "./types";
import { formatDate, formatMonthYearPt, today } from "@/lib/format";

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Inferência para despesas antigas sem `centroCusto` */
function inferCentroFromCategoria(c: CategoriaDespesa): CentroCustoDespesa {
  switch (c) {
    case "sementes":
    case "adubo":
    case "defensivo":
      return "insumos";
    case "combustivel":
      return "transporte";
    case "mao_de_obra":
      return "mao_de_obra";
    case "manutencao":
      return "manutencao";
    case "outros":
    default:
      return "plantio";
  }
}

/** Centro de custo efetivo (cadastrado ou inferido) */
export function getCentroCustoEfetivo(d: Despesa): CentroCustoDespesa {
  return d.centroCusto ?? inferCentroFromCategoria(d.categoria);
}

export function filterByDateRange<T extends { data: string }>(
  items: T[],
  dataInicio: string,
  dataFim: string
): T[] {
  return items.filter((d) => d.data >= dataInicio && d.data <= dataFim);
}

export interface ResumoCultura {
  culturaId: string;
  nome: string;
  despesas: number;
  vendas: number;
  saldo: number;
  /** Despesas da cultura por centro de custo (só centros com valor > 0) */
  despesasPorCentro: Array<{ centro: CentroCustoDespesa; total: number }>;
}

export function computeResumoPorCultura(
  culturas: Cultura[],
  despesas: Despesa[],
  vendas: Venda[]
): ResumoCultura[] {
  return culturas
    .map((c) => {
      const listaDespCultura = despesas.filter((d) => d.culturaId === c.id);
      const despesasCultura = listaDespCultura.reduce((s, d) => s + d.valor, 0);
      const porCentro = new Map<CentroCustoDespesa, number>();
      for (const d of listaDespCultura) {
        const cc = getCentroCustoEfetivo(d);
        porCentro.set(cc, (porCentro.get(cc) ?? 0) + d.valor);
      }
      const despesasPorCentro = CENTRO_CUSTO_ORDER.map((centro) => ({
        centro,
        total: porCentro.get(centro) ?? 0,
      }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total);
      const vendasCultura = vendas
        .filter((v) => v.culturaId === c.id)
        .reduce((s, v) => s + v.valorTotal, 0);
      return {
        culturaId: c.id,
        nome: c.nome,
        despesas: despesasCultura,
        vendas: vendasCultura,
        saldo: vendasCultura - despesasCultura,
        despesasPorCentro,
      };
    })
    .filter((r) => r.despesas > 0 || r.vendas > 0);
}

export interface ResumoCentroCusto {
  centro: CentroCustoDespesa;
  label: string;
  total: number;
  /** Percentual do total de despesas no conjunto (0–100) */
  percentOfDespesas: number;
}

/** Agrega despesas por centro de custo no período (para dashboard / relatórios) */
export function computeResumoPorCentroCusto(despesas: Despesa[]): ResumoCentroCusto[] {
  const map = new Map<CentroCustoDespesa, number>();
  for (const d of despesas) {
    const cc = getCentroCustoEfetivo(d);
    map.set(cc, (map.get(cc) ?? 0) + d.valor);
  }
  const totalGeral = despesas.reduce((s, d) => s + d.valor, 0);
  return CENTRO_CUSTO_ORDER.map((centro) => {
    const total = map.get(centro) ?? 0;
    return {
      centro,
      label: CENTRO_CUSTO_LABELS[centro],
      total,
      percentOfDespesas: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
    };
  })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function sumFinanceiro(filteredDespesas: Despesa[], filteredVendas: Venda[]) {
  const totalDespesas = filteredDespesas.reduce((s, d) => s + d.valor, 0);
  const totalVendas = filteredVendas.reduce((s, v) => s + v.valorTotal, 0);
  return {
    totalDespesas,
    totalVendas,
    saldo: totalVendas - totalDespesas,
  };
}

/** Cultura com maior saldo (vendas − despesas) no período; empate → primeira */
export function culturaMaisLucrativa(resumos: ResumoCultura[]): ResumoCultura | null {
  if (resumos.length === 0) return null;
  return resumos.reduce((best, r) => (r.saldo > best.saldo ? r : best), resumos[0]);
}

/** Safra com maior soma de despesas vinculadas (campo safraId) */
export function safraComMaiorCusto(
  despesas: Despesa[],
  safras: Safra[],
  culturas: Cultura[]
): { total: number; label: string } | null {
  const map = new Map<string, number>();
  for (const d of despesas) {
    if (!d.safraId) continue;
    map.set(d.safraId, (map.get(d.safraId) ?? 0) + d.valor);
  }
  if (map.size === 0) return null;
  let bestId = "";
  let best = 0;
  for (const [id, t] of map) {
    if (t > best) {
      best = t;
      bestId = id;
    }
  }
  const safra = safras.find((s) => s.id === bestId);
  const nomeCult = safra ? culturas.find((c) => c.id === safra.culturaId)?.nome ?? "—" : "—";
  const label = safra
    ? `${nomeCult} · início ${formatDate(safra.dataInicio)}`
    : bestId;
  return { total: best, label };
}

/** Mês (YYYY-MM) com maior soma de despesas no conjunto informado */
export function mesComMaiorGasto(despesas: Despesa[]): { monthKey: string; total: number } | null {
  if (despesas.length === 0) return null;
  const byMonth = new Map<string, number>();
  for (const d of despesas) {
    const key = d.data.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + d.valor);
  }
  let bestKey = "";
  let best = 0;
  for (const [k, v] of byMonth) {
    if (v > best) {
      best = v;
      bestKey = k;
    }
  }
  return bestKey ? { monthKey: bestKey, total: best } : null;
}

/** Canal com maior faturamento no período */
export function canalMaisRentavel(vendas: Venda[]): { canal: CanalVenda; total: number; label: string } | null {
  if (vendas.length === 0) return null;
  const map = new Map<CanalVenda, number>();
  for (const v of vendas) {
    map.set(v.canal, (map.get(v.canal) ?? 0) + v.valorTotal);
  }
  let bestCanal: CanalVenda | null = null;
  let best = 0;
  for (const [c, t] of map) {
    if (t > best) {
      best = t;
      bestCanal = c;
    }
  }
  if (!bestCanal) return null;
  return { canal: bestCanal, total: best, label: CANAL_LABELS[bestCanal] };
}

/** Margem sobre vendas: (vendas − despesas) / vendas; null se sem vendas */
export function margemSobreVendasPercent(totalVendas: number, totalDespesas: number): number | null {
  if (totalVendas <= 0) return null;
  return ((totalVendas - totalDespesas) / totalVendas) * 100;
}

/** Meses entre dataInicio e dataFim (YYYY-MM), inclusive */
export function eachMonthInRange(dataInicio: string, dataFim: string): string[] {
  const start = dataInicio.slice(0, 7);
  const end = dataFim.slice(0, 7);
  if (start > end) return [];
  const out: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const endY = Number(end.slice(0, 4));
  const endM = Number(end.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export interface ResumoMensalFinanceiro {
  mesKey: string;
  mesLabel: string;
  totalDespesas: number;
  totalVendas: number;
  saldo: number;
}

/** Vendas e despesas agregadas por mês civil no intervalo (para relatório de lucro/prejuízo mensal) */
export function computeResumoMensalLucroPrejuizo(
  despesas: Despesa[],
  vendas: Venda[],
  dataInicio: string,
  dataFim: string
): ResumoMensalFinanceiro[] {
  const fd = filterByDateRange(despesas, dataInicio, dataFim);
  const fv = filterByDateRange(vendas, dataInicio, dataFim);
  const months = eachMonthInRange(dataInicio, dataFim);
  return months.map((mesKey) => {
    const totalDespesas = fd.filter((d) => d.data.slice(0, 7) === mesKey).reduce((s, d) => s + d.valor, 0);
    const totalVendas = fv.filter((v) => v.data.slice(0, 7) === mesKey).reduce((s, v) => s + v.valorTotal, 0);
    return {
      mesKey,
      mesLabel: formatMonthYearPt(`${mesKey}-01`),
      totalDespesas,
      totalVendas,
      saldo: totalVendas - totalDespesas,
    };
  });
}

/**
 * Receitas e custos da safra apenas na interseção com [dataInicio, dataFim]
 * (receita = vendas da cultura no período; custo = despesas com safraId no período).
 */
export function calcularIndicadoresSafraNoPeriodo(
  safra: Safra,
  despesas: Despesa[],
  vendas: Venda[],
  dataInicio: string,
  dataFim: string,
  todayIso: string = today()
): IndicadoresSafra {
  const fim = dataFimReceitaSafra(safra, todayIso);
  const start = maxDate(safra.dataInicio, dataInicio);
  const end = minDate(fim, dataFim);
  if (start > end) {
    return { receita: 0, custo: 0, saldo: 0 };
  }
  const receita = vendas
    .filter((v) => v.culturaId === safra.culturaId && v.data >= start && v.data <= end)
    .reduce((s, v) => s + v.valorTotal, 0);
  const custo = despesas
    .filter((d) => d.safraId === safra.id && d.data >= start && d.data <= end)
    .reduce((s, d) => s + d.valor, 0);
  return { receita, custo, saldo: receita - custo };
}

/**
 * Data final usada para somar receitas da safra: vendas contam até o fim declarado da safra
 * ou até hoje (o que for menor), para safras em andamento ou com término futuro.
 */
export function dataFimReceitaSafra(safra: Safra, todayIso: string): string {
  if (!safra.dataFim) return todayIso;
  return safra.dataFim < todayIso ? safra.dataFim : todayIso;
}

export interface IndicadoresSafra {
  receita: number;
  /** Soma de despesas com `safraId` igual a esta safra */
  custo: number;
  saldo: number;
}

/**
 * Receita: vendas da mesma cultura com data entre início da safra e fim efetivo da receita.
 * Custo: soma de despesas explicitamente vinculadas à safra (`safraId`).
 */
export function calcularIndicadoresSafra(
  safra: Safra,
  despesas: Despesa[],
  vendas: Venda[],
  todayIso: string
): IndicadoresSafra {
  const fim = dataFimReceitaSafra(safra, todayIso);
  if (safra.dataInicio > fim) {
    return { receita: 0, custo: 0, saldo: 0 };
  }

  const receita = vendas
    .filter((v) => v.culturaId === safra.culturaId && v.data >= safra.dataInicio && v.data <= fim)
    .reduce((s, v) => s + v.valorTotal, 0);

  const custo = despesas.filter((d) => d.safraId === safra.id).reduce((s, d) => s + d.valor, 0);

  return { receita, custo, saldo: receita - custo };
}

export interface ComparativoSafraRow {
  safraId: string;
  culturaNome: string;
  labelPeriodo: string;
  receita: number;
  custo: number;
  saldo: number;
}

/** Linhas ordenadas por saldo (maior primeiro) para comparativo entre safras */
export function buildComparativoSafras(
  safras: Safra[],
  culturas: Cultura[],
  despesas: Despesa[],
  vendas: Venda[],
  todayIso: string
): ComparativoSafraRow[] {
  const rows: ComparativoSafraRow[] = safras.map((s) => {
    const { receita, custo, saldo } = calcularIndicadoresSafra(s, despesas, vendas, todayIso);
    const nome = culturas.find((c) => c.id === s.culturaId)?.nome ?? "—";
    const labelPeriodo = s.dataFim
      ? `${formatDate(s.dataInicio)} — ${formatDate(s.dataFim)}`
      : `${formatDate(s.dataInicio)} — em andamento`;
    return {
      safraId: s.id,
      culturaNome: nome,
      labelPeriodo,
      receita,
      custo,
      saldo,
    };
  });
  return rows.sort((a, b) => b.saldo - a.saldo);
}
