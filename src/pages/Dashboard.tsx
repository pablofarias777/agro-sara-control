import { useEffect, useMemo, useState } from "react";
import {
  previousPeriodRange,
  rangeMesCalendario,
  mesAnterior,
  resumoFinanceiroCultura,
  duasSafrasMaisRecentes,
  variacaoPercentual,
} from "@/domain/comparisons";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import {
  getDespesasByPropriedade,
  getVendasByPropriedade,
  getCulturasByPropriedade,
  getSafrasByPropriedade,
  getMetas,
} from "@/infra/storage";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import type { Despesa, Venda, Cultura, Safra, Meta, CategoriaDespesa, CanalVenda } from "@/domain/types";
import { formatBRL, formatDate, formatMonthYearPt, today, formatQuantidade } from "@/lib/format";
import { computeProgressosMetas } from "@/domain/metas";
import {
  computeResumoPorCultura,
  computeResumoPorCentroCusto,
  sumFinanceiro,
  culturaMaisLucrativa,
  safraComMaiorCusto,
  mesComMaiorGasto,
  canalMaisRentavel,
  margemSobreVendasPercent,
  calcularIndicadoresSafra,
  type ResumoCentroCusto,
} from "@/domain/finance";
import { CENTRO_CUSTO_LABELS, CATEGORIA_LABELS, CANAL_LABELS } from "@/domain/labels";
import { FiltersPanel, FilterField } from "@/components/FiltersPanel";
import {
  FILTRO_TODOS,
  filterDespesasLista,
  filterVendasLista,
  type StatusSafraFiltro,
  safraEstaEncerrada,
} from "@/lib/listFilters";
import { AlertsPanel } from "@/components/AlertsPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Leaf,
  Award,
  Sprout,
  CalendarDays,
  Store,
  PieChart,
  Layers,
  Target,
  GitCompare,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { propriedadeAtivaId, ready } = usePropriedade();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => today());
  const [culturaIdA, setCulturaIdA] = useState("");
  const [culturaIdB, setCulturaIdB] = useState("");

  const [filtroCultura, setFiltroCultura] = useState(FILTRO_TODOS);
  const [filtroSafra, setFiltroSafra] = useState(FILTRO_TODOS);
  const [filtroCategoria, setFiltroCategoria] = useState<string>(FILTRO_TODOS);
  const [filtroCanal, setFiltroCanal] = useState<string>(FILTRO_TODOS);
  const [filtroStatusSafra, setFiltroStatusSafra] = useState<StatusSafraFiltro>("todas");

  const hojeIso = today();

  const safrasNoSelect = useMemo(() => {
    let s = safras;
    if (filtroCultura !== FILTRO_TODOS) s = s.filter((x) => x.culturaId === filtroCultura);
    if (filtroStatusSafra === "em_andamento") s = s.filter((x) => !safraEstaEncerrada(x, hojeIso));
    if (filtroStatusSafra === "encerradas") s = s.filter((x) => safraEstaEncerrada(x, hojeIso));
    return s;
  }, [safras, filtroCultura, filtroStatusSafra, hojeIso]);

  const fdFv = useMemo(() => {
    const fd = filterDespesasLista(despesas, {
      dataInicio,
      dataFim,
      culturaId: filtroCultura,
      safraId: filtroSafra,
      categoria: filtroCategoria as CategoriaDespesa | typeof FILTRO_TODOS,
    });
    const fv = filterVendasLista(vendas, safras, hojeIso, {
      dataInicio,
      dataFim,
      culturaId: filtroCultura,
      safraId: filtroSafra,
      canal: filtroCanal as CanalVenda | typeof FILTRO_TODOS,
    });
    return { fd, fv };
  }, [
    despesas,
    vendas,
    safras,
    dataInicio,
    dataFim,
    filtroCultura,
    filtroSafra,
    filtroCategoria,
    filtroCanal,
    hojeIso,
  ]);

  const limparFiltrosDashboard = () => {
    setFiltroCultura(FILTRO_TODOS);
    setFiltroSafra(FILTRO_TODOS);
    setFiltroCategoria(FILTRO_TODOS);
    setFiltroCanal(FILTRO_TODOS);
    setFiltroStatusSafra("todas");
  };

  useEffect(() => {
    if (filtroSafra !== FILTRO_TODOS && !safrasNoSelect.some((s) => s.id === filtroSafra)) {
      setFiltroSafra(FILTRO_TODOS);
    }
  }, [filtroSafra, safrasNoSelect]);

  useEffect(() => {
    if (!ready || !propriedadeAtivaId) return;
    Promise.all([
      getDespesasByPropriedade(propriedadeAtivaId),
      getVendasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getSafrasByPropriedade(propriedadeAtivaId),
      getMetas(),
    ]).then(([d, v, c, s, meta]) => {
      setDespesas(d);
      setVendas(v);
      setCulturas(c);
      setSafras(s);
      setMetas(meta);
    });
  }, [ready, propriedadeAtivaId]);

  useEffect(() => {
    if (culturas.length >= 2 && !culturaIdA && !culturaIdB) {
      setCulturaIdA(culturas[0].id);
      setCulturaIdB(culturas[1].id);
    }
  }, [culturas, culturaIdA, culturaIdB]);

  const temFinanceiro = despesas.length > 0 || vendas.length > 0;

  const comparacoes = useMemo(() => {
    if (!temFinanceiro) return null;
    const fd = fdFv.fd;
    const fv = fdFv.fv;
    const atualPeriodo = sumFinanceiro(fd, fv);

    const prevR = previousPeriodRange(dataInicio, dataFim);
    const anteriorPeriodo = prevR
      ? sumFinanceiro(
          filterDespesasLista(despesas, {
            dataInicio: prevR.inicio,
            dataFim: prevR.fim,
            culturaId: filtroCultura,
            safraId: filtroSafra,
            categoria: filtroCategoria as CategoriaDespesa | typeof FILTRO_TODOS,
          }),
          filterVendasLista(vendas, safras, hojeIso, {
            dataInicio: prevR.inicio,
            dataFim: prevR.fim,
            culturaId: filtroCultura,
            safraId: filtroSafra,
            canal: filtroCanal as CanalVenda | typeof FILTRO_TODOS,
          })
        )
      : null;

    const ym = hojeIso.slice(0, 7);
    const ymAnt = mesAnterior(ym);
    const rMesAtual = rangeMesCalendario(ym);
    const rMesAnt = rangeMesCalendario(ymAnt);
    const mesAtual = sumFinanceiro(
      filterDespesasLista(despesas, {
        dataInicio: rMesAtual.inicio,
        dataFim: rMesAtual.fim,
        culturaId: filtroCultura,
        safraId: filtroSafra,
        categoria: filtroCategoria as CategoriaDespesa | typeof FILTRO_TODOS,
      }),
      filterVendasLista(vendas, safras, hojeIso, {
        dataInicio: rMesAtual.inicio,
        dataFim: rMesAtual.fim,
        culturaId: filtroCultura,
        safraId: filtroSafra,
        canal: filtroCanal as CanalVenda | typeof FILTRO_TODOS,
      })
    );
    const mesAnteriorTotais = sumFinanceiro(
      filterDespesasLista(despesas, {
        dataInicio: rMesAnt.inicio,
        dataFim: rMesAnt.fim,
        culturaId: filtroCultura,
        safraId: filtroSafra,
        categoria: filtroCategoria as CategoriaDespesa | typeof FILTRO_TODOS,
      }),
      filterVendasLista(vendas, safras, hojeIso, {
        dataInicio: rMesAnt.inicio,
        dataFim: rMesAnt.fim,
        culturaId: filtroCultura,
        safraId: filtroSafra,
        canal: filtroCanal as CanalVenda | typeof FILTRO_TODOS,
      })
    );

    let culturasCmp: {
      nomeA: string;
      nomeB: string;
      a: ReturnType<typeof resumoFinanceiroCultura>;
      b: ReturnType<typeof resumoFinanceiroCultura>;
    } | null = null;
    if (culturaIdA && culturaIdB && culturaIdA !== culturaIdB) {
      culturasCmp = {
        nomeA: culturas.find((c) => c.id === culturaIdA)?.nome ?? "—",
        nomeB: culturas.find((c) => c.id === culturaIdB)?.nome ?? "—",
        a: resumoFinanceiroCultura(culturaIdA, fd, fv),
        b: resumoFinanceiroCultura(culturaIdB, fd, fv),
      };
    }

    const safrasCmp: {
      culturaNome: string;
      labelAtual: string;
      labelAnt: string;
      atual: ReturnType<typeof calcularIndicadoresSafra>;
      anterior: ReturnType<typeof calcularIndicadoresSafra>;
    }[] = [];
    if (filtroSafra === FILTRO_TODOS) {
      const culturasLoop =
        filtroCultura !== FILTRO_TODOS ? culturas.filter((c) => c.id === filtroCultura) : culturas;
      for (const c of culturasLoop) {
        const pair = duasSafrasMaisRecentes(safras, c.id);
        if (!pair) continue;
        const [sNova, sVelha] = pair;
        safrasCmp.push({
          culturaNome: c.nome,
          labelAtual: sNova.dataFim
            ? `${formatDate(sNova.dataInicio)} — ${formatDate(sNova.dataFim)}`
            : `${formatDate(sNova.dataInicio)} · atual`,
          labelAnt: sVelha.dataFim
            ? `${formatDate(sVelha.dataInicio)} — ${formatDate(sVelha.dataFim)}`
            : `${formatDate(sVelha.dataInicio)} · anterior`,
          atual: calcularIndicadoresSafra(sNova, despesas, vendas, hojeIso),
          anterior: calcularIndicadoresSafra(sVelha, despesas, vendas, hojeIso),
        });
      }
    }

    return {
      atualPeriodo,
      anteriorPeriodo,
      prevRange: prevR,
      mesAtual,
      mesAnteriorTotais,
      ym,
      ymAnt,
      culturasCmp,
      safrasCmp,
    };
  }, [
    temFinanceiro,
    despesas,
    vendas,
    culturas,
    safras,
    dataInicio,
    dataFim,
    culturaIdA,
    culturaIdB,
    fdFv,
    filtroCultura,
    filtroSafra,
    filtroCategoria,
    filtroCanal,
    hojeIso,
  ]);

  const m = useMemo(() => {
    const fd = fdFv.fd;
    const fv = fdFv.fv;
    const resumo = computeResumoPorCultura(culturas, fd, fv);
    const resumoCentro = computeResumoPorCentroCusto(fd);
    const { totalDespesas, totalVendas, saldo } = sumFinanceiro(fd, fv);
    return {
      fd,
      fv,
      resumo,
      resumoCentro,
      totalDespesas,
      totalVendas,
      saldo,
      culturaLucro: culturaMaisLucrativa(resumo),
      safraCusto: safraComMaiorCusto(fd, safras, culturas),
      mesGasto: mesComMaiorGasto(fd),
      canalRent: canalMaisRentavel(fv),
      margem: margemSobreVendasPercent(totalVendas, totalDespesas),
    };
  }, [fdFv, culturas, safras]);

  const metasFiltradas = useMemo(() => {
    const cids = new Set(culturas.map((c) => c.id));
    const sids = new Set(safras.map((s) => s.id));
    return metas.filter((m) => {
      if (m.escopo === "cultura" && m.culturaId) return cids.has(m.culturaId);
      if (m.escopo === "safra" && m.safraId) return sids.has(m.safraId);
      return false;
    });
  }, [metas, culturas, safras]);

  const progressosMetas = useMemo(
    () => computeProgressosMetas(metasFiltradas, culturas, safras, despesas, vendas, dataInicio, dataFim, today()),
    [metasFiltradas, culturas, safras, despesas, vendas, dataInicio, dataFim]
  );

  const semDadosGlobais = despesas.length === 0 && vendas.length === 0 && metasFiltradas.length === 0;
  const semDadosPeriodo = m.fd.length === 0 && m.fv.length === 0;

  if (!ready || !propriedadeAtivaId) {
    return (
      <Layout title="Dashboard">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <AlertsPanel
        financePeriod={{ start: dataInicio, end: dataFim }}
        className="mb-4"
        propriedadeId={propriedadeAtivaId}
      />

      <FiltersPanel onClear={limparFiltrosDashboard}>
        <FilterField label="Período">
          <div className="flex gap-2">
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-10 flex-1 min-w-0"
            />
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-10 flex-1 min-w-0" />
          </div>
        </FilterField>
        <FilterField label="Cultura">
          <Select
            value={filtroCultura}
            onValueChange={(v) => {
              setFiltroCultura(v);
              setFiltroSafra(FILTRO_TODOS);
            }}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODOS}>Todas</SelectItem>
              {culturas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Safra">
          <Select value={filtroSafra} onValueChange={setFiltroSafra}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODOS}>Todas</SelectItem>
              {safrasNoSelect.map((s) => {
                const cn = culturas.find((c) => c.id === s.culturaId)?.nome || "";
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {cn} — {formatDate(s.dataInicio)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Status da safra (refina lista)">
          <Select value={filtroStatusSafra} onValueChange={(v) => setFiltroStatusSafra(v as StatusSafraFiltro)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="encerradas">Encerradas</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Categoria da despesa">
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODOS}>Todas</SelectItem>
              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Canal de venda">
          <Select value={filtroCanal} onValueChange={setFiltroCanal}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
              {Object.entries(CANAL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FiltersPanel>

      {temFinanceiro && comparacoes && (
        <section className="rounded-xl bg-card border border-border p-4 md:p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h2 className="text-base font-semibold">Comparações</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tabelas compactas com atual, anterior e variação percentual (Δ). Culturas seguem o período do filtro acima.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {comparacoes.anteriorPeriodo && comparacoes.prevRange && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Período do filtro vs período anterior
                </h3>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Anterior: {formatDate(comparacoes.prevRange.inicio)} — {formatDate(comparacoes.prevRange.fim)} (mesma
                  duração)
                </p>
                <CmpMetricTable
                  rows={[
                    {
                      label: "Despesas",
                      atual: comparacoes.atualPeriodo.totalDespesas,
                      ant: comparacoes.anteriorPeriodo.totalDespesas,
                    },
                    {
                      label: "Vendas",
                      atual: comparacoes.atualPeriodo.totalVendas,
                      ant: comparacoes.anteriorPeriodo.totalVendas,
                    },
                    {
                      label: "Saldo",
                      atual: comparacoes.atualPeriodo.saldo,
                      ant: comparacoes.anteriorPeriodo.saldo,
                    },
                  ]}
                />
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Mês atual vs mês anterior (calendário)
              </h3>
              <p className="text-[11px] text-muted-foreground mb-2">
                {formatMonthYearPt(`${comparacoes.ym}-01`)} · {formatMonthYearPt(`${comparacoes.ymAnt}-01`)}
              </p>
              <CmpMetricTable
                rows={[
                  {
                    label: "Despesas",
                    atual: comparacoes.mesAtual.totalDespesas,
                    ant: comparacoes.mesAnteriorTotais.totalDespesas,
                  },
                  {
                    label: "Vendas",
                    atual: comparacoes.mesAtual.totalVendas,
                    ant: comparacoes.mesAnteriorTotais.totalVendas,
                  },
                  {
                    label: "Saldo",
                    atual: comparacoes.mesAtual.saldo,
                    ant: comparacoes.mesAnteriorTotais.saldo,
                  },
                ]}
              />
            </div>

            {culturas.length >= 2 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Cultura A vs cultura B (período do filtro)
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px]">Cultura A</Label>
                    <Select value={culturaIdA} onValueChange={setCulturaIdA}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Cultura A" />
                      </SelectTrigger>
                      <SelectContent>
                        {culturas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[11px]">Cultura B</Label>
                    <Select value={culturaIdB} onValueChange={setCulturaIdB}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Cultura B" />
                      </SelectTrigger>
                      <SelectContent>
                        {culturas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!comparacoes.culturasCmp && (
                  <p className="text-xs text-muted-foreground mb-2">Selecione duas culturas diferentes para comparar.</p>
                )}
                {comparacoes.culturasCmp && (
                <div className="grid grid-cols-3 text-center text-xs sm:text-sm rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 py-2 font-medium text-muted-foreground border-b border-border" />
                  <div className="bg-muted/50 py-2 font-semibold truncate px-1 border-b border-border">
                    {comparacoes.culturasCmp.nomeA}
                  </div>
                  <div className="bg-muted/50 py-2 font-semibold truncate px-1 border-b border-border">
                    {comparacoes.culturasCmp.nomeB}
                  </div>
                  <div className="py-2 px-2 text-muted-foreground text-left border-t border-border">Despesas</div>
                  <div className="py-2 px-2 font-semibold tabular-nums border-t border-border">
                    {formatBRL(comparacoes.culturasCmp.a.despesas)}
                  </div>
                  <div className="py-2 px-2 font-semibold tabular-nums border-t border-border">
                    {formatBRL(comparacoes.culturasCmp.b.despesas)}
                  </div>
                  <div className="py-2 px-2 text-muted-foreground text-left border-t border-border">Vendas</div>
                  <div className="py-2 px-2 font-semibold tabular-nums text-income border-t border-border">
                    {formatBRL(comparacoes.culturasCmp.a.vendas)}
                  </div>
                  <div className="py-2 px-2 font-semibold tabular-nums text-income border-t border-border">
                    {formatBRL(comparacoes.culturasCmp.b.vendas)}
                  </div>
                  <div className="py-2 px-2 text-muted-foreground text-left border-t border-border">Saldo</div>
                  <div
                    className={cn(
                      "py-2 px-2 font-semibold tabular-nums border-t border-border",
                      comparacoes.culturasCmp.a.saldo >= 0 ? "text-income" : "text-expense"
                    )}
                  >
                    {formatBRL(comparacoes.culturasCmp.a.saldo)}
                  </div>
                  <div
                    className={cn(
                      "py-2 px-2 font-semibold tabular-nums border-t border-border",
                      comparacoes.culturasCmp.b.saldo >= 0 ? "text-income" : "text-expense"
                    )}
                  >
                    {formatBRL(comparacoes.culturasCmp.b.saldo)}
                  </div>
                </div>
                )}
              </div>
            )}

            {comparacoes.safrasCmp.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Safra mais recente vs safra anterior (por cultura)
                </h3>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Receita e custo acumulados de cada safra (receita até hoje ou fim da safra; custo das despesas vinculadas).
                </p>
                <div className="space-y-3">
                  {comparacoes.safrasCmp.map((s) => (
                    <div key={s.culturaNome} className="rounded-lg border border-border/80 bg-muted/15 p-3">
                      <div className="font-medium text-sm mb-2">{s.culturaNome}</div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        <span className="text-foreground/90">Atual:</span> {s.labelAtual} ·{" "}
                        <span className="text-foreground/90">Anterior:</span> {s.labelAnt}
                      </p>
                      <CmpMetricTable
                        rows={[
                          { label: "Receita", atual: s.atual.receita, ant: s.anterior.receita },
                          { label: "Custo", atual: s.atual.custo, ant: s.anterior.custo },
                          { label: "Saldo", atual: s.atual.saldo, ant: s.anterior.saldo },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {metas.length > 0 && (
        <section className="rounded-xl bg-card border border-border p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-base font-semibold">Metas</h2>
            </div>
            <Link to="/metas" className="text-xs font-medium text-primary hover:underline shrink-0">
              Gerenciar
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Comparado ao período {formatDate(dataInicio)} — {formatDate(dataFim)} (interseção com a safra, quando aplicável).
          </p>
          <div className="space-y-4">
            {progressosMetas.map((p) => (
              <div key={p.meta.id} className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
                <div>
                  <div className="font-medium text-sm">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {p.semPeriodo ? "Sem interseção entre o período do filtro e a safra." : p.periodoLabel}
                  </div>
                </div>
                {!p.semPeriodo && p.faturamento && (
                  <MetaBar
                    label="Faturamento"
                    atual={formatBRL(p.faturamento.atual)}
                    alvo={formatBRL(p.faturamento.meta)}
                    pct={p.faturamento.pctBar}
                    variant="income"
                  />
                )}
                {!p.semPeriodo && p.gasto && (
                  <div className="space-y-1">
                    <MetaBar
                      label="Gastos (limite)"
                      atual={formatBRL(p.gasto.atual)}
                      alvo={formatBRL(p.gasto.limite)}
                      pct={p.gasto.pctBar}
                      variant={p.gasto.excedeu ? "danger" : "expense"}
                    />
                    <p className={cn("text-[10px]", p.gasto.excedeu ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {((p.gasto.atual / p.gasto.limite) * 100).toFixed(0)}% do limite
                      {p.gasto.excedeu ? " · acima do limite" : ""}
                    </p>
                  </div>
                )}
                {!p.semPeriodo && p.quantidade && (
                  <MetaBar
                    label="Quantidade vendida"
                    atual={formatQuantidade(p.quantidade.atual)}
                    alvo={formatQuantidade(p.quantidade.meta)}
                    pct={p.quantidade.pctBar}
                    variant="neutral"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {semDadosGlobais ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Nenhum registro ainda</p>
          <p className="text-sm mt-1">Cadastre culturas, despesas e vendas para ver o resumo aqui.</p>
        </div>
      ) : (
        <>
          {/* Resumo financeiro do período */}
          <section className="rounded-xl bg-card border border-border p-4 md:p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-base font-semibold">Resumo financeiro do período</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {formatDate(dataInicio)} — {formatDate(dataFim)}
            </p>
            {semDadosPeriodo ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum lançamento neste período.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <SummaryMini
                    icon={<TrendingDown className="h-5 w-5" />}
                    label="Total em despesas"
                    value={formatBRL(m.totalDespesas)}
                    variant="expense"
                  />
                  <SummaryMini
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="Total em vendas"
                    value={formatBRL(m.totalVendas)}
                    variant="income"
                  />
                  <SummaryMini
                    icon={<Wallet className="h-5 w-5" />}
                    label="Saldo (vendas − despesas)"
                    value={formatBRL(m.saldo)}
                    variant={m.saldo >= 0 ? "income" : "expense"}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">Margem s/ vendas</span>
                    <span className="font-semibold">
                      {m.margem == null ? "—" : `${m.margem.toFixed(1)}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Lançamentos</span>
                    <span className="font-semibold">
                      {m.fd.length} desp. · {m.fv.length} vend.
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Ticket médio (despesa)</span>
                    <span className="font-semibold">
                      {m.fd.length === 0 ? "—" : formatBRL(m.totalDespesas / m.fd.length)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Ticket médio (venda)</span>
                    <span className="font-semibold">
                      {m.fv.length === 0 ? "—" : formatBRL(m.totalVendas / m.fv.length)}
                    </span>
                  </div>
                </div>

                {m.resumoCentro.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm font-semibold">Despesas por centro de custo</h3>
                    </div>
                    <div className="space-y-2">
                      {m.resumoCentro.map((row) => (
                        <CentroCustoBar key={row.centro} row={row} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Indicadores */}
          {!semDadosPeriodo && (
            <section className="mb-6">
              <h2 className="text-base font-semibold mb-3 text-foreground">Indicadores do período</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <InsightCard
                  icon={<Award className="h-5 w-5 text-primary" />}
                  title="Cultura mais lucrativa"
                  value={m.culturaLucro ? m.culturaLucro.nome : "—"}
                  sub={
                    m.culturaLucro
                      ? `Saldo ${formatBRL(m.culturaLucro.saldo)} · vendas ${formatBRL(m.culturaLucro.vendas)} · custos ${formatBRL(m.culturaLucro.despesas)}`
                      : "Sem movimento por cultura no período."
                  }
                />
                <InsightCard
                  icon={<Sprout className="h-5 w-5 text-primary" />}
                  title="Safra com maior custo"
                  value={m.safraCusto ? formatBRL(m.safraCusto.total) : "—"}
                  sub={
                    m.safraCusto
                      ? m.safraCusto.label
                      : "Nenhuma despesa vinculada a safra no período."
                  }
                />
                <InsightCard
                  icon={<CalendarDays className="h-5 w-5 text-primary" />}
                  title="Mês com maior gasto"
                  value={m.mesGasto ? formatBRL(m.mesGasto.total) : "—"}
                  sub={m.mesGasto ? formatMonthYearPt(m.mesGasto.monthKey) : "Sem despesas no período."}
                />
                <InsightCard
                  icon={<Store className="h-5 w-5 text-primary" />}
                  title="Canal de venda mais rentável"
                  value={m.canalRent ? formatBRL(m.canalRent.total) : "—"}
                  sub={m.canalRent ? m.canalRent.label : "Sem vendas no período."}
                />
              </div>
            </section>
          )}

          {m.resumo.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                Resumo por cultura
              </h2>
              <div className="space-y-2">
                {m.resumo.map((r) => (
                  <div key={r.nome} className="rounded-lg bg-card border border-border p-4">
                    <div className="font-semibold mb-2">{r.nome}</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Despesas</span>
                        <div className="font-medium text-expense">{formatBRL(r.despesas)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendas</span>
                        <div className="font-medium text-income">{formatBRL(r.vendas)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Saldo</span>
                        <div className={cn("font-medium", r.saldo >= 0 ? "text-income" : "text-expense")}>
                          {formatBRL(r.saldo)}
                        </div>
                      </div>
                    </div>
                    {r.despesasPorCentro.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/80 space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Despesas por centro</div>
                        {r.despesasPorCentro.map(({ centro, total }) => (
                          <div key={centro} className="flex justify-between text-xs gap-2">
                            <span className="text-muted-foreground">{CENTRO_CUSTO_LABELS[centro]}</span>
                            <span className="font-medium text-expense tabular-nums shrink-0">{formatBRL(total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </Layout>
  );
}

function CmpMetricTable({
  rows,
}: {
  rows: { label: string; atual: number; ant: number }[];
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden text-xs sm:text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-2 sm:gap-x-3 items-center bg-muted/40 px-2 sm:px-3 py-2 font-medium text-[10px] sm:text-xs text-muted-foreground">
        <span />
        <span className="text-right whitespace-nowrap">Atual</span>
        <span className="text-right whitespace-nowrap">Anterior</span>
        <span className="text-right w-9 sm:w-11 shrink-0">Δ</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-2 sm:gap-x-3 items-center px-2 sm:px-3 py-2 border-t border-border/80"
        >
          <span className="text-muted-foreground truncate">{r.label}</span>
          <span className="text-right font-semibold tabular-nums whitespace-nowrap">{formatBRL(r.atual)}</span>
          <span className="text-right font-medium tabular-nums text-muted-foreground whitespace-nowrap">
            {formatBRL(r.ant)}
          </span>
          <span className="text-right">
            <DeltaPct atual={r.atual} ant={r.ant} />
          </span>
        </div>
      ))}
    </div>
  );
}

function DeltaPct({ atual, ant }: { atual: number; ant: number }) {
  const p = variacaoPercentual(atual, ant);
  if (p === null) return <span className="text-muted-foreground text-[10px] sm:text-xs">—</span>;
  const up = p >= 0;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums text-[10px] sm:text-xs whitespace-nowrap",
        up ? "text-income" : "text-expense"
      )}
    >
      {up ? "↑" : "↓"}
      {Math.abs(p).toFixed(0)}%
    </span>
  );
}

function MetaBar({
  label,
  atual,
  alvo,
  pct,
  variant,
}: {
  label: string;
  atual: string;
  alvo: string;
  pct: number;
  variant: "income" | "expense" | "danger" | "neutral";
}) {
  const fill =
    variant === "income"
      ? "bg-income"
      : variant === "danger"
        ? "bg-destructive"
        : variant === "expense"
          ? "bg-expense/80"
          : "bg-primary/80";
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-right">
          {atual} <span className="text-muted-foreground font-normal">/ {alvo}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CentroCustoBar({ row }: { row: ResumoCentroCusto }) {
  return (
    <div>
      <div className="flex justify-between text-xs gap-2 mb-1">
        <span className="text-muted-foreground truncate">{row.label}</span>
        <span className="shrink-0 font-semibold text-expense tabular-nums">
          {formatBRL(row.total)}{" "}
          <span className="text-muted-foreground font-normal">({row.percentOfDespesas.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-expense/80 transition-all"
          style={{ width: `${Math.min(100, row.percentOfDespesas)}%` }}
        />
      </div>
    </div>
  );
}

function SummaryMini({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant: "income" | "expense";
}) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/80 p-3 flex items-start gap-3">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          variant === "income" ? "bg-success/10 text-income" : "bg-destructive/10 text-expense"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground leading-tight">{label}</div>
        <div className="text-lg font-bold tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-col gap-3 min-h-[118px]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-medium text-muted-foreground leading-snug">{title}</h3>
          <p className="text-lg font-bold mt-1 break-words tabular-nums">{value}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-2">{sub}</p>
    </div>
  );
}
