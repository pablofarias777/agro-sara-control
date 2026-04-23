import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import {
  getSafrasByPropriedade,
  saveSafra,
  deleteSafra,
  getCulturasByPropriedade,
  getAllEtapasSafra,
  getDespesasByPropriedade,
  getVendasByPropriedade,
} from "@/infra/storage";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import type { Safra, Cultura, EtapaCalendarioSafra, Despesa, Venda } from "@/domain/types";
import { SafraCalendarioSection } from "@/components/SafraCalendarioSection";
import { formatBRL, formatDate, today } from "@/lib/format";
import { calcularIndicadoresSafra, buildComparativoSafras } from "@/domain/finance";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sprout, Plus, Trash2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FiltersPanel, FilterField } from "@/components/FiltersPanel";
import { FILTRO_TODOS, filterSafrasLista, type StatusSafraFiltro } from "@/lib/listFilters";

export default function Safras() {
  const { propriedadeAtivaId, ready } = usePropriedade();
  const [safras, setSafras] = useState<Safra[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [etapas, setEtapas] = useState<EtapaCalendarioSafra[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [open, setOpen] = useState(false);
  const [culturaId, setCulturaId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [obs, setObs] = useState("");

  const [filtroCultura, setFiltroCultura] = useState(FILTRO_TODOS);
  const [filtroStatus, setFiltroStatus] = useState<StatusSafraFiltro>("todas");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");

  const load = async () => {
    if (!propriedadeAtivaId) return;
    const [s, c, d, v, allEtapas] = await Promise.all([
      getSafrasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getDespesasByPropriedade(propriedadeAtivaId),
      getVendasByPropriedade(propriedadeAtivaId),
      getAllEtapasSafra(),
    ]);
    const safraIds = new Set(s.map((x) => x.id));
    setSafras(s);
    setCulturas(c);
    setEtapas(allEtapas.filter((e) => safraIds.has(e.safraId)));
    setDespesas(d);
    setVendas(v);
  };
  useEffect(() => {
    if (!ready || !propriedadeAtivaId) return;
    load();
  }, [ready, propriedadeAtivaId]);

  const hoje = useMemo(() => today(), []);

  const safrasFiltradas = useMemo(
    () =>
      filterSafrasLista(safras, hoje, {
        culturaId: filtroCultura,
        status: filtroStatus,
        dataInicioPeriodo: filtroInicio && filtroFim ? filtroInicio : undefined,
        dataFimPeriodo: filtroInicio && filtroFim ? filtroFim : undefined,
      }),
    [safras, hoje, filtroCultura, filtroStatus, filtroInicio, filtroFim]
  );

  const comparativo = useMemo(
    () => buildComparativoSafras(safrasFiltradas, culturas, despesas, vendas, hoje),
    [safrasFiltradas, culturas, despesas, vendas, hoje]
  );

  const indicadoresPorSafra = useMemo(() => {
    const m = new Map<string, ReturnType<typeof calcularIndicadoresSafra>>();
    for (const s of safrasFiltradas) {
      m.set(s.id, calcularIndicadoresSafra(s, despesas, vendas, hoje));
    }
    return m;
  }, [safrasFiltradas, despesas, vendas, hoje]);

  const limparFiltrosLista = () => {
    setFiltroCultura(FILTRO_TODOS);
    setFiltroStatus("todas");
    setFiltroInicio("");
    setFiltroFim("");
  };

  const reset = () => {
    setCulturaId("");
    setDataInicio("");
    setDataFim("");
    setObs("");
  };

  const handleSave = async () => {
    if (!culturaId || !dataInicio) return;
    const cult = culturas.find((x) => x.id === culturaId);
    if (!cult) return;
    await saveSafra({
      id: createId(),
      propriedadeId: cult.propriedadeId,
      culturaId,
      dataInicio,
      dataFim: dataFim || undefined,
      observacoes: obs || undefined,
    });
    setOpen(false);
    reset();
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta safra?")) {
      await deleteSafra(id);
      load();
    }
  };

  const culturaNome = (id: string) => culturas.find((c) => c.id === id)?.nome || "—";

  if (!ready || !propriedadeAtivaId) {
    return (
      <Layout title="Safras">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Safras">
      <div className="flex justify-end mb-4">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button className="h-12 gap-2">
              <Plus className="h-5 w-5" /> Nova Safra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Safra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Cultura</Label>
                <Select value={culturaId} onValueChange={setCulturaId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Selecione" />
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
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Data de Término (opcional)</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Anotações sobre a safra..." />
              </div>
              <Button onClick={handleSave} className="w-full h-12 text-base">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {safras.length === 0 ? (
        <EmptyState icon={<Sprout className="h-12 w-12" />} title="Nenhuma safra" description="Crie safras vinculadas às suas culturas" />
      ) : (
        <>
          <FiltersPanel onClear={limparFiltrosLista}>
            <FilterField label="Cultura">
              <Select value={filtroCultura} onValueChange={setFiltroCultura}>
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
            <FilterField label="Status da safra">
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusSafraFiltro)}>
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
            <FilterField label="Início da safra entre">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filtroInicio}
                  onChange={(e) => setFiltroInicio(e.target.value)}
                  className="h-10 flex-1 min-w-0"
                />
                <Input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} className="h-10 flex-1 min-w-0" />
              </div>
            </FilterField>
          </FiltersPanel>

          {safrasFiltradas.length === 0 ? (
            <EmptyState
              icon={<Sprout className="h-12 w-12" />}
              title="Nenhuma safra com esses filtros"
              description="Ajuste os filtros ou limpe para ver todas"
            />
          ) : (
            <>
          <section className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/30">
              <BarChart3 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h2 className="text-sm font-semibold">Comparativo entre safras</h2>
                <p className="text-xs text-muted-foreground">Ordenado por saldo (maior primeiro)</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Cultura</TableHead>
                  <TableHead className="min-w-[120px] hidden sm:table-cell">Período</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparativo.map((row) => (
                  <TableRow key={row.safraId}>
                    <TableCell className="font-medium">{row.culturaNome}</TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">{row.labelPeriodo}</TableCell>
                    <TableCell className="text-right tabular-nums text-income">{formatBRL(row.receita)}</TableCell>
                    <TableCell className="text-right tabular-nums text-expense">{formatBRL(row.custo)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-semibold",
                        row.saldo >= 0 ? "text-income" : "text-expense"
                      )}
                    >
                      {formatBRL(row.saldo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11px] text-muted-foreground px-4 py-2 border-t border-border bg-muted/20 leading-relaxed">
              Receita: vendas da cultura com data dentro do período da safra. Custo: despesas com esta safra selecionada
              no lançamento.
            </p>
          </section>

          <div className="space-y-3">
            {safrasFiltradas.map((s) => {
              const ind = indicadoresPorSafra.get(s.id) ?? { receita: 0, custo: 0, saldo: 0 };
              return (
                <div key={s.id} className="rounded-xl bg-card border border-border p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold">{culturaNome(s.culturaId)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(s.dataInicio)}
                        {s.dataFim ? ` — ${formatDate(s.dataFim)}` : " — em andamento"}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 border border-border/80 p-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Receita</div>
                      <div className="text-sm font-semibold tabular-nums text-income">{formatBRL(ind.receita)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Custo</div>
                      <div className="text-sm font-semibold tabular-nums text-expense">{formatBRL(ind.custo)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo</div>
                      <div
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          ind.saldo >= 0 ? "text-income" : "text-expense"
                        )}
                      >
                        {formatBRL(ind.saldo)}
                      </div>
                    </div>
                  </div>

                  {s.observacoes && <p className="text-sm text-muted-foreground">{s.observacoes}</p>}

                  <SafraCalendarioSection
                    safraId={s.id}
                    etapas={etapas.filter((e) => e.safraId === s.id)}
                    onReload={load}
                  />
                </div>
              );
            })}
          </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
