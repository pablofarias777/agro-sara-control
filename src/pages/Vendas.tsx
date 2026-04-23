import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import {
  getVendasByPropriedade,
  saveVenda,
  deleteVenda,
  getCulturasByPropriedade,
  getSafrasByPropriedade,
} from "@/infra/storage";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import type { Safra } from "@/domain/types";
import type { Venda, Cultura, CanalVenda } from "@/domain/types";
import { formatBRL, formatDate, today, parseDecimalInput } from "@/lib/format";
import { CANAL_LABELS, UNIDADE_LABELS } from "@/domain/labels";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { FiltersPanel, FilterField } from "@/components/FiltersPanel";
import { FILTRO_TODOS, filterVendasLista } from "@/lib/listFilters";

export default function Vendas() {
  const { propriedadeAtivaId, ready } = usePropriedade();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [open, setOpen] = useState(false);

  const [data, setData] = useState(() => today());
  const [culturaId, setCulturaId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState("kg");
  const [valorTotal, setValorTotal] = useState("");
  const [canal, setCanal] = useState<CanalVenda>("feira");

  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [filtroCultura, setFiltroCultura] = useState(FILTRO_TODOS);
  const [filtroSafra, setFiltroSafra] = useState(FILTRO_TODOS);
  const [filtroCanal, setFiltroCanal] = useState<string>(FILTRO_TODOS);

  const safrasFiltradas = useMemo(() => {
    if (filtroCultura === FILTRO_TODOS) return safras;
    return safras.filter((s) => s.culturaId === filtroCultura);
  }, [safras, filtroCultura]);

  const vendasFiltradas = useMemo(() => {
    return filterVendasLista(vendas, safras, today(), {
      dataInicio: filtroInicio && filtroFim ? filtroInicio : undefined,
      dataFim: filtroInicio && filtroFim ? filtroFim : undefined,
      culturaId: filtroCultura,
      safraId: filtroSafra,
      canal: filtroCanal as CanalVenda | typeof FILTRO_TODOS,
    });
  }, [vendas, safras, filtroInicio, filtroFim, filtroCultura, filtroSafra, filtroCanal]);

  const limparFiltros = () => {
    setFiltroInicio("");
    setFiltroFim("");
    setFiltroCultura(FILTRO_TODOS);
    setFiltroSafra(FILTRO_TODOS);
    setFiltroCanal(FILTRO_TODOS);
  };

  const load = async () => {
    if (!propriedadeAtivaId) return;
    const [v, c, s] = await Promise.all([
      getVendasByPropriedade(propriedadeAtivaId),
      getCulturasByPropriedade(propriedadeAtivaId),
      getSafrasByPropriedade(propriedadeAtivaId),
    ]);
    setVendas(v);
    setCulturas(c);
    setSafras(s);
  };
  useEffect(() => {
    if (!ready || !propriedadeAtivaId) return;
    load();
  }, [ready, propriedadeAtivaId]);

  const reset = () => {
    setData(today());
    setCulturaId("");
    setQuantidade("");
    setUnidade("kg");
    setValorTotal("");
    setCanal("feira");
  };

  const onCulturaChange = (id: string) => {
    setCulturaId(id);
    const c = culturas.find((x) => x.id === id);
    if (c) setUnidade(c.unidadePadrao);
  };

  const handleSave = async () => {
    const qtd = parseDecimalInput(quantidade);
    const vt = parseDecimalInput(valorTotal);
    if (!data || !culturaId || isNaN(qtd) || isNaN(vt) || qtd <= 0 || vt <= 0 || !propriedadeAtivaId) return;
    await saveVenda({
      id: createId(),
      propriedadeId: propriedadeAtivaId,
      data,
      culturaId,
      quantidade: qtd,
      unidade,
      valorTotal: vt,
      canal,
    });
    setOpen(false);
    reset();
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta venda?")) {
      await deleteVenda(id);
      load();
    }
  };

  const sorted = [...vendasFiltradas].sort((a, b) => b.data.localeCompare(a.data));

  if (!ready || !propriedadeAtivaId) {
    return (
      <Layout title="Vendas">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Vendas">
      <FiltersPanel onClear={limparFiltros}>
        <FilterField label="Período (data da venda)">
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
        <FilterField label="Safra (vendas no período da safra)">
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
              <Plus className="h-5 w-5" /> Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Venda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Cultura</Label>
                <Select value={culturaId} onValueChange={onCulturaChange}>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="0"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={unidade} onValueChange={setUnidade}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIDADE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  placeholder="0,00"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Canal de Venda</Label>
                <Select value={canal} onValueChange={(v) => setCanal(v as CanalVenda)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CANAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
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

      {vendas.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="Nenhuma venda"
          description="Registre suas vendas para acompanhar a receita"
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="Nenhuma venda com esses filtros"
          description="Ajuste os filtros ou limpe para ver todas"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((v) => (
            <div key={v.id} className="rounded-xl bg-card border border-border p-4 flex justify-between items-start">
              <div>
                <div className="font-semibold">{culturas.find((c) => c.id === v.culturaId)?.nome}</div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3">
                  <span>{formatDate(v.data)}</span>
                  <span>
                    {v.quantidade} {v.unidade}
                  </span>
                  <span>{CANAL_LABELS[v.canal]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-income whitespace-nowrap">{formatBRL(v.valorTotal)}</span>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
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
