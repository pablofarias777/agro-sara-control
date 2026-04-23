import type { Cultura, Despesa, Meta, Safra, Venda } from "./types";
import { dataFimReceitaSafra } from "./finance";
import { formatDate } from "@/lib/format";

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Interseção entre o período do dashboard e o escopo da meta (cultura = período do filtro; safra = janela da safra ∩ filtro) */
export function periodoEfetivoMeta(
  meta: Meta,
  safra: Safra | undefined,
  dataInicio: string,
  dataFim: string,
  todayIso: string
): { start: string; end: string } | null {
  if (meta.escopo === "cultura" && meta.culturaId) {
    if (dataInicio > dataFim) return null;
    return { start: dataInicio, end: dataFim };
  }
  if (meta.escopo === "safra" && safra) {
    const fimSafra = dataFimReceitaSafra(safra, todayIso);
    const start = maxDate(safra.dataInicio, dataInicio);
    const end = minDate(fimSafra, dataFim);
    if (start > end) return null;
    return { start, end };
  }
  return null;
}

export interface MetaProgressoView {
  meta: Meta;
  /** Ex.: "Milho" ou "Soja — safra" */
  label: string;
  /** Intervalo usado nos cálculos */
  periodoLabel: string;
  /** Sem interseção entre safra e período do filtro */
  semPeriodo: boolean;
  faturamento?: { meta: number; atual: number; pctBar: number };
  gasto?: { limite: number; atual: number; pctBar: number; excedeu: boolean };
  quantidade?: { meta: number; atual: number; pctBar: number };
}

function sumVendasFiltradas(vendas: Venda[], culturaId: string, start: string, end: string) {
  return vendas.filter((v) => v.culturaId === culturaId && v.data >= start && v.data <= end);
}

export function computeProgressosMetas(
  metas: Meta[],
  culturas: Cultura[],
  safras: Safra[],
  despesas: Despesa[],
  vendas: Venda[],
  dataInicio: string,
  dataFim: string,
  todayIso: string
): MetaProgressoView[] {
  const culturaNome = (id: string) => culturas.find((c) => c.id === id)?.nome ?? "—";

  return metas.map((meta) => {
    const safra = meta.escopo === "safra" && meta.safraId ? safras.find((s) => s.id === meta.safraId) : undefined;
    const periodo = periodoEfetivoMeta(meta, safra, dataInicio, dataFim, todayIso);

    let label = "";
    if (meta.escopo === "cultura" && meta.culturaId) {
      label = `${culturaNome(meta.culturaId)} · cultura`;
    } else if (meta.escopo === "safra" && safra) {
      const cn = culturaNome(safra.culturaId);
      label = `${cn} · safra`;
    } else {
      label = "Meta";
    }

    if (!periodo) {
      return {
        meta,
        label,
        periodoLabel: "—",
        semPeriodo: true,
      };
    }

    const { start, end } = periodo;
    const periodoLabel = `${formatDate(start)} — ${formatDate(end)}`;

    let culturaIdAlvo = "";
    if (meta.escopo === "cultura" && meta.culturaId) culturaIdAlvo = meta.culturaId;
    if (meta.escopo === "safra" && safra) culturaIdAlvo = safra.culturaId;

    const vendasNoPeriodo = sumVendasFiltradas(vendas, culturaIdAlvo, start, end);
    const faturamentoAtual = vendasNoPeriodo.reduce((s, v) => s + v.valorTotal, 0);
    const qtdAtual = vendasNoPeriodo.reduce((s, v) => s + v.quantidade, 0);

    let gastoAtual = 0;
    if (meta.escopo === "cultura" && meta.culturaId) {
      gastoAtual = despesas
        .filter((d) => d.culturaId === meta.culturaId && d.data >= start && d.data <= end)
        .reduce((s, d) => s + d.valor, 0);
    } else if (meta.escopo === "safra" && safra) {
      gastoAtual = despesas
        .filter((d) => d.safraId === safra.id && d.data >= start && d.data <= end)
        .reduce((s, d) => s + d.valor, 0);
    }

    const pctToward = (atual: number, alvo: number) =>
      alvo > 0 ? Math.min(100, (atual / alvo) * 100) : 0;

    const out: MetaProgressoView = {
      meta,
      label,
      periodoLabel,
      semPeriodo: false,
    };

    if (meta.metaFaturamento != null && meta.metaFaturamento > 0) {
      out.faturamento = {
        meta: meta.metaFaturamento,
        atual: faturamentoAtual,
        pctBar: pctToward(faturamentoAtual, meta.metaFaturamento),
      };
    }
    if (meta.limiteGasto != null && meta.limiteGasto > 0) {
      const excedeu = gastoAtual > meta.limiteGasto;
      const pctRaw = (gastoAtual / meta.limiteGasto) * 100;
      out.gasto = {
        limite: meta.limiteGasto,
        atual: gastoAtual,
        pctBar: Math.min(100, pctRaw),
        excedeu,
      };
    }
    if (meta.metaQuantidadeVendida != null && meta.metaQuantidadeVendida > 0) {
      out.quantidade = {
        meta: meta.metaQuantidadeVendida,
        atual: qtdAtual,
        pctBar: pctToward(qtdAtual, meta.metaQuantidadeVendida),
      };
    }

    return out;
  });
}
