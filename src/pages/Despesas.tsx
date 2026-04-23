import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import {
  getDespesasByPropriedade,
  saveDespesa,
  deleteDespesa,
  getCulturasByPropriedade,
  getSafrasByPropriedade,
} from "@/infra/storage";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import type { Despesa, Cultura, Safra, CategoriaDespesa, CentroCustoDespesa } from "@/domain/types";
import { formatBRL, formatDate, today, parseDecimalInput } from "@/lib/format";
import { CATEGORIA_LABELS, CENTRO_CUSTO_LABELS, CENTRO_CUSTO_ORDER } from "@/domain/labels";
import { getCentroCustoEfetivo } from "@/domain/finance";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { FiltersPanel, FilterField } from "@/components/FiltersPanel";
import { FILTRO_TODOS, filterDespesasLista } from "@/lib/listFilters";

export default function Despesas() {
  const { propriedadeAtivaId, ready } = usePropriedade();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [open, setOpen] = useState(false);

  const [data, setData] = useState(() => today());
  const [categoria, setCategoria] = useState<CategoriaDespesa>("outros");
  const [centroCusto, setCentroCusto] = useState<CentroCustoDespesa>("insumos");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [culturaId, setCulturaId] = useState("");
  const [safraId, setSafraId] = useState("");

  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [filtroCultura, setFiltroCultura] = useState(FILTRO_TODOS);
  const [filtroSafra, setFiltroSafra] = useState(FILTRO_TODOS);
  const [filtroCategoria, setFiltroCategoria] = useState<string>(FILTRO_TODOS);

  const safrasFiltradas = useMemo(() => {
    if (filtroCultura === FILTRO_TODOS) return safras;
    return safras.filter((s) => s.culturaId === filtroCultura);
  }, [safras, filtroCultura]);

  const despesasFiltradas = useMemo(() => {
    return filterDespesasLista(despesas, {
      dataInicio: filtroInicio && filtroFim ? filtroInicio : undefined,
      dataFim: filtroInicio && filtroFim ? filtroFim : undefined,
      culturaId: filtroCultura,
      safraId: filtroSafra,
      categoria: filtroCategoria as CategoriaDespesa | typeof FILTRO_TODOS,
    });
  }, [despesas, filtroInicio, filtroFim, filtroCultura, filtroSafra, filtroCategoria]);

  const limparFiltros = () => {
    setFiltroInicio("");
    setFiltroFim("");
    setFiltroCultura(FILTRO_TODOS);
    setFiltroSafra(FILTRO_TODOS);
    setFiltroCategoria(FILTRO_TODOS);
  };

  const load = async () => {
    if (!propriedadeAtivaId) return;
    const [d, c, s] = await Promise.all([
      getDespesasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getSafrasByPropriedade(propriedadeAtivaId),
    ]);
    setDespesas(d);
    setCulturas(c);
    setSafras(s);
  };
  useEffect(() => {
    if (!ready || !propriedadeAtivaId) return;
    load();
  }, [ready, propriedadeAtivaId]);

  const reset = () => {
    setData(today());
    setCategoria("outros");
    setCentroCusto("insumos");
    setDescricao("");
    setValor("");
    setCulturaId("");
    setSafraId("");
  };

  const handleSave = async () => {
    const v = parseDecimalInput(valor);
    if (!data || !descricao.trim() || isNaN(v) || v <= 0 || !propriedadeAtivaId) return;
    await saveDespesa({
      id: createId(),
      propriedadeId: propriedadeAtivaId,
      data,
      categoria,
      centroCusto,
      descricao: descricao.trim(),
      valor: v,
      culturaId: culturaId && culturaId !== "none" ? culturaId : undefined,
      safraId: safraId && safraId !== "none" ? safraId : undefined,
    });
    setOpen(false);
    reset();
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta despesa?")) {
      await deleteDespesa(id);
      load();
    }
  };

  const sorted = [...despesasFiltradas].sort((a, b) => b.data.localeCompare(a.data));

  if (!ready || !propriedadeAtivaId) {
    return (
      <Layout title="Despesas">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Despesas">
      <FiltersPanel onClear={limparFiltros}>
        <FilterField label="Período (data da despesa)">
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
        <FilterField label="Cultura">
          <Select value={filtroCultura} onValueChange={(v) => { setFiltroCultura(v); setFiltroSafra(FILTRO_TODOS); }}>
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
              {safrasFiltradas.map((s) => {
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
        <FilterField label="Categoria">
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
      </FiltersPanel>

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
              <Plus className="h-5 w-5" /> Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaDespesa)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Centro de custo</Label>
                <p className="text-xs text-muted-foreground">Agrupa despesas para análise no dashboard.</p>
                <Select value={centroCusto} onValueChange={(v) => setCentroCusto(v as CentroCustoDespesa)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CENTRO_CUSTO_ORDER.map((k) => (
                      <SelectItem key={k} value={k}>
                        {CENTRO_CUSTO_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Saco de adubo NPK"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Cultura (opcional)</Label>
                <Select value={culturaId} onValueChange={setCulturaId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {culturas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Safra (opcional)</Label>
                <Select value={safraId} onValueChange={setSafraId}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {safras.map((s) => {
                      const cn = culturas.find((c) => c.id === s.culturaId)?.nome || "";
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {cn} — {formatDate(s.dataInicio)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full h-12 text-base">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {despesas.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-12 w-12" />}
          title="Nenhuma despesa"
          description="Registre seus gastos da propriedade"
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-12 w-12" />}
          title="Nenhuma despesa com esses filtros"
          description="Ajuste os filtros ou limpe para ver todas"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => (
            <div key={d.id} className="rounded-xl bg-card border border-border p-4 flex justify-between items-start">
              <div>
                <div className="font-semibold">{d.descricao}</div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span>{formatDate(d.data)}</span>
                  <span>{CATEGORIA_LABELS[d.categoria]}</span>
                  <span className="text-foreground/80">{CENTRO_CUSTO_LABELS[getCentroCustoEfetivo(d)]}</span>
                  {d.culturaId && <span>{culturas.find((c) => c.id === d.culturaId)?.nome}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-expense whitespace-nowrap">{formatBRL(d.valor)}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
