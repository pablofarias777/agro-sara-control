import { filterByDateRange, sumFinanceiro } from "./finance";
import { ETAPA_SAFRA_LABELS } from "./labels";
import type { Cultura, Despesa, EtapaCalendarioSafra, Safra, Venda } from "./types";
import { daysBetweenInclusive, daysUntil, subDaysIso } from "@/lib/dates";
import { formatDate } from "@/lib/format";

export type AlertSeverity = "warning" | "destructive";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  message: string;
};

const SAFRA_FIM_DIAS = 14;
const DESPESA_MULT_ANTERIOR = 1.4;
const VENDA_FRACAO_DA_MEDIA = 0.75;
const HISTORICO_VENDAS_DIAS = 120;

function culturaNome(culturas: Cultura[], id: string): string {
  return culturas.find((c) => c.id === id)?.nome ?? "Cultura";
}

function sumDespesas(d: Despesa[]): number {
  return d.reduce((s, x) => s + x.valor, 0);
}

function sumVendas(v: Venda[]): number {
  return v.reduce((s, x) => s + x.valorTotal, 0);
}

/**
 * Alertas operacionais + financeiros para o período informado.
 * `today` deve ser YYYY-MM-DD (ex.: today() do app).
 */
export function computeAlerts(params: {
  today: string;
  financePeriod: { start: string; end: string };
  despesas: Despesa[];
  vendas: Venda[];
  safras: Safra[];
  etapas: EtapaCalendarioSafra[];
  culturas: Cultura[];
}): AlertItem[] {
  const { today, financePeriod, despesas, vendas, safras, etapas, culturas } = params;
  const { start: p0, end: p1 } = financePeriod;
  const out: AlertItem[] = [];

  // --- Safras próximas do fim (dataFim entre hoje e +14 dias) ---
  for (const s of safras) {
    if (!s.dataFim) continue;
    const d = daysUntil(today, s.dataFim);
    if (d >= 0 && d <= SAFRA_FIM_DIAS) {
      const nome = culturaNome(culturas, s.culturaId);
      const msg =
        d === 0
          ? `A safra de ${nome} encerra hoje.`
          : `A safra de ${nome} termina em ${d} dia(s) (${formatDate(s.dataFim)}).`;
      out.push({ id: `safra-fim-${s.id}`, severity: d <= 3 ? "destructive" : "warning", message: msg });
    }
  }

  // --- Tarefas do calendário atrasadas ---
  const atrasadas = etapas.filter((e) => !e.concluida && e.dataPrevista < today);
  if (atrasadas.length > 0) {
    if (atrasadas.length === 1) {
      const e = atrasadas[0];
      const safra = safras.find((x) => x.id === e.safraId);
      const cult = safra ? culturaNome(culturas, safra.culturaId) : "safra";
      out.push({
        id: `etapa-atrasada-${e.id}`,
        severity: "destructive",
        message: `Etapa atrasada: ${ETAPA_SAFRA_LABELS[e.tipo]} (${cult}).`,
      });
    } else {
      out.push({
        id: "etapas-atrasadas",
        severity: "destructive",
        message: `${atrasadas.length} etapas do calendário agrícola estão atrasadas.`,
      });
    }
  }

  // --- Financeiro no período ---
  const despesasP = filterByDateRange(despesas, p0, p1);
  const vendasP = filterByDateRange(vendas, p0, p1);
  const { totalDespesas, totalVendas, saldo } = sumFinanceiro(despesasP, vendasP);

  if (despesasP.length + vendasP.length > 0 && saldo < 0) {
    out.push({
      id: `saldo-neg-${p0}-${p1}`,
      severity: "destructive",
      message: "Saldo do período está negativo (vendas abaixo das despesas).",
    });
  }

  const diasP = Math.max(1, daysBetweenInclusive(p0, p1));
  const prevEnd = subDaysIso(p0, 1);
  const prevStart = subDaysIso(prevEnd, diasP - 1);
  const despesasPrev = filterByDateRange(despesas, prevStart, prevEnd);
  const totalPrev = sumDespesas(despesasPrev);
  if (despesasP.length > 0 && totalPrev > 0 && totalDespesas > totalPrev * DESPESA_MULT_ANTERIOR) {
    out.push({
      id: `despesa-alta-${p0}-${p1}`,
      severity: "warning",
      message: "Despesas neste período estão bem acima do período anterior.",
    });
  }

  const histInicio = subDaysIso(p0, HISTORICO_VENDAS_DIAS);
  const histFim = subDaysIso(p0, 1);
  const vendasHist = vendas.filter((v) => v.data >= histInicio && v.data <= histFim);
  const diasHist = Math.max(1, daysBetweenInclusive(histInicio, histFim));
  const mediaDiaria = sumVendas(vendasHist) / diasHist;
  const esperadoPeriodo = mediaDiaria * diasP;
  if (vendasHist.length > 0 && esperadoPeriodo > 0 && totalVendas < esperadoPeriodo * VENDA_FRACAO_DA_MEDIA) {
    out.push({
      id: `vendas-baixas-${p0}-${p1}`,
      severity: "warning",
      message: "Vendas no período estão abaixo da média recente.",
    });
  }

  return out;
}
