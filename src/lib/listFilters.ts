import type { CategoriaDespesa, CanalVenda, Despesa, Safra, Venda } from "@/domain/types";
import { dataFimReceitaSafra } from "@/domain/finance";

export const FILTRO_TODOS = "__all__";

export type StatusSafraFiltro = "todas" | "em_andamento" | "encerradas";

export function safraEstaEncerrada(s: Safra, hojeIso: string): boolean {
  return s.dataFim != null && s.dataFim < hojeIso;
}

/** Vendas cuja data está no intervalo de receita da safra (cultura + datas). */
export function vendaDentroDaSafra(v: Venda, safra: Safra, hojeIso: string): boolean {
  if (v.culturaId !== safra.culturaId) return false;
  const fim = dataFimReceitaSafra(safra, hojeIso);
  return v.data >= safra.dataInicio && v.data <= fim;
}

export function filterDespesasLista(
  despesas: Despesa[],
  opts: {
    dataInicio?: string;
    dataFim?: string;
    culturaId?: string;
    safraId?: string;
    categoria?: CategoriaDespesa | typeof FILTRO_TODOS;
  }
): Despesa[] {
  let out = despesas;
  if (opts.dataInicio && opts.dataFim) {
    out = out.filter((d) => d.data >= opts.dataInicio! && d.data <= opts.dataFim!);
  }
  if (opts.culturaId && opts.culturaId !== FILTRO_TODOS) {
    out = out.filter((d) => d.culturaId === opts.culturaId);
  }
  if (opts.safraId && opts.safraId !== FILTRO_TODOS) {
    out = out.filter((d) => d.safraId === opts.safraId);
  }
  if (opts.categoria && opts.categoria !== FILTRO_TODOS) {
    out = out.filter((d) => d.categoria === opts.categoria);
  }
  return out;
}

export function filterVendasLista(
  vendas: Venda[],
  safras: Safra[],
  hojeIso: string,
  opts: {
    dataInicio?: string;
    dataFim?: string;
    culturaId?: string;
    safraId?: string;
    canal?: CanalVenda | typeof FILTRO_TODOS;
  }
): Venda[] {
  let out = vendas;
  if (opts.dataInicio && opts.dataFim) {
    out = out.filter((v) => v.data >= opts.dataInicio! && v.data <= opts.dataFim!);
  }
  if (opts.culturaId && opts.culturaId !== FILTRO_TODOS) {
    out = out.filter((v) => v.culturaId === opts.culturaId);
  }
  if (opts.canal && opts.canal !== FILTRO_TODOS) {
    out = out.filter((v) => v.canal === opts.canal);
  }
  if (opts.safraId && opts.safraId !== FILTRO_TODOS) {
    const safra = safras.find((s) => s.id === opts.safraId);
    if (!safra) return [];
    out = out.filter((v) => vendaDentroDaSafra(v, safra, hojeIso));
  }
  return out;
}

export function filterSafrasLista(
  safras: Safra[],
  hojeIso: string,
  opts: {
    culturaId?: string;
    status?: StatusSafraFiltro;
    /** Início da safra dentro do intervalo (inclusive) */
    dataInicioPeriodo?: string;
    dataFimPeriodo?: string;
  }
): Safra[] {
  let out = safras;
  if (opts.culturaId && opts.culturaId !== FILTRO_TODOS) {
    out = out.filter((s) => s.culturaId === opts.culturaId);
  }
  if (opts.status === "em_andamento") {
    out = out.filter((s) => !safraEstaEncerrada(s, hojeIso));
  } else if (opts.status === "encerradas") {
    out = out.filter((s) => safraEstaEncerrada(s, hojeIso));
  }
  if (opts.dataInicioPeriodo && opts.dataFimPeriodo) {
    out = out.filter(
      (s) => s.dataInicio >= opts.dataInicioPeriodo! && s.dataInicio <= opts.dataFimPeriodo!
    );
  }
  return out;
}
