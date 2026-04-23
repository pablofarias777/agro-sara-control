import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import {
  getMetas,
  saveMeta,
  deleteMeta,
  getCulturasByPropriedade,
  getSafrasByPropriedade,
} from "@/infra/storage";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import type { Meta, Cultura, Safra, EscopoMeta } from "@/domain/types";
import { createId } from "@/lib/id";
import { formatBRL, formatDate, parseDecimalInput, formatQuantidade } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Plus, Pencil, Trash2 } from "lucide-react";

function resumoMeta(m: Meta): string {
  const parts: string[] = [];
  if (m.metaFaturamento != null && m.metaFaturamento > 0) parts.push(`Faturamento ${formatBRL(m.metaFaturamento)}`);
  if (m.limiteGasto != null && m.limiteGasto > 0) parts.push(`Limite gasto ${formatBRL(m.limiteGasto)}`);
  if (m.metaQuantidadeVendida != null && m.metaQuantidadeVendida > 0)
    parts.push(`Qtd. ${formatQuantidade(m.metaQuantidadeVendida)}`);
  return parts.join(" · ") || "—";
}

export default function MetasPage() {
  const { propriedadeAtivaId, ready } = usePropriedade();
  const [lista, setLista] = useState<Meta[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [safras, setSafras] = useState<Safra[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meta | null>(null);
  const [escopo, setEscopo] = useState<EscopoMeta>("cultura");
  const [culturaId, setCulturaId] = useState("");
  const [safraId, setSafraId] = useState("");
  const [metaFat, setMetaFat] = useState("");
  const [limiteGastoStr, setLimiteGastoStr] = useState("");
  const [metaQtd, setMetaQtd] = useState("");

  const load = async () => {
    if (!propriedadeAtivaId) return;
    const [allMeta, c, s] = await Promise.all([getMetas(), getCulturasByPropriedade(propriedadeAtivaId), getSafrasByPropriedade(propriedadeAtivaId)]);
    const cids = new Set(c.map((x) => x.id));
    const sids = new Set(s.map((x) => x.id));
    const filtradas = allMeta.filter((m) => {
      if (m.escopo === "cultura" && m.culturaId) return cids.has(m.culturaId);
      if (m.escopo === "safra" && m.safraId) return sids.has(m.safraId);
      return false;
    });
    setLista(filtradas);
    setCulturas(c);
    setSafras(s);
  };
  useEffect(() => {
    if (!ready || !propriedadeAtivaId) return;
    load();
  }, [ready, propriedadeAtivaId]);

  const reset = () => {
    setEscopo("cultura");
    setCulturaId("");
    setSafraId("");
    setMetaFat("");
    setLimiteGastoStr("");
    setMetaQtd("");
    setEditing(null);
  };

  const handleOpen = (m?: Meta) => {
    if (m) {
      setEditing(m);
      setEscopo(m.escopo);
      setCulturaId(m.culturaId ?? "");
      setSafraId(m.safraId ?? "");
      setMetaFat(m.metaFaturamento != null && m.metaFaturamento > 0 ? String(m.metaFaturamento).replace(".", ",") : "");
      setLimiteGastoStr(m.limiteGasto != null && m.limiteGasto > 0 ? String(m.limiteGasto).replace(".", ",") : "");
      setMetaQtd(
        m.metaQuantidadeVendida != null && m.metaQuantidadeVendida > 0
          ? String(m.metaQuantidadeVendida).replace(".", ",")
          : ""
      );
    } else reset();
    setOpen(true);
  };

  const handleSave = async () => {
    const mf = parseDecimalInput(metaFat || "0");
    const lg = parseDecimalInput(limiteGastoStr || "0");
    const mq = parseDecimalInput(metaQtd || "0");
    const temMeta = (mf > 0 ? 1 : 0) + (lg > 0 ? 1 : 0) + (mq > 0 ? 1 : 0);
    if (temMeta === 0) return;
    if (escopo === "cultura" && (!culturaId || culturaId === "none")) return;
    if (escopo === "safra" && (!safraId || safraId === "none")) return;

    await saveMeta({
      id: editing?.id || createId(),
      escopo,
      culturaId: escopo === "cultura" ? culturaId : undefined,
      safraId: escopo === "safra" ? safraId : undefined,
      metaFaturamento: mf > 0 ? mf : undefined,
      limiteGasto: lg > 0 ? lg : undefined,
      metaQuantidadeVendida: mq > 0 ? mq : undefined,
    });
    setOpen(false);
    reset();
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta meta?")) {
      await deleteMeta(id);
      load();
    }
  };

  const labelCard = (m: Meta) => {
    if (m.escopo === "cultura" && m.culturaId) {
      return `${culturas.find((c) => c.id === m.culturaId)?.nome ?? "—"} · cultura`;
    }
    if (m.escopo === "safra" && m.safraId) {
      const s = safras.find((x) => x.id === m.safraId);
      const cn = s ? culturas.find((c) => c.id === s.culturaId)?.nome ?? "—" : "—";
      return `${cn} · safra (${s ? formatDate(s.dataInicio) : "—"})`;
    }
    return "Meta";
  };

  if (!ready || !propriedadeAtivaId) {
    return (
      <Layout title="Metas">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </Layout>
    );
  }

  return (
    <Layout title="Metas">
      <div className="flex justify-end mb-4">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()} className="h-12 gap-2" disabled={culturas.length === 0}>
              <Plus className="h-5 w-5" /> Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Escopo</Label>
                <Select
                  value={escopo}
                  onValueChange={(v) => {
                    setEscopo(v as EscopoMeta);
                    setCulturaId("");
                    setSafraId("");
                  }}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cultura">Por cultura</SelectItem>
                    <SelectItem value="safra" disabled={safras.length === 0}>
                      Por safra
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {escopo === "cultura" && (
                <div className="space-y-2">
                  <Label>Cultura</Label>
                  <Select value={culturaId || "none"} onValueChange={(v) => setCulturaId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione…</SelectItem>
                      {culturas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {escopo === "safra" && (
                <div className="space-y-2">
                  <Label>Safra</Label>
                  <Select value={safraId || "none"} onValueChange={(v) => setSafraId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione…</SelectItem>
                      {safras.map((s) => {
                        const cn = culturas.find((c) => c.id === s.culturaId)?.nome ?? "";
                        return (
                          <SelectItem key={s.id} value={s.id}>
                            {cn} — {formatDate(s.dataInicio)}
                            {s.dataFim ? ` → ${formatDate(s.dataFim)}` : " (em andamento)"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Preencha ao menos um dos valores abaixo. O progresso no dashboard usa o mesmo período (datas) do filtro do
                dashboard; para safra, considera-se a interseção com o período da safra.
              </p>

              <div className="space-y-2">
                <Label>Meta de faturamento (R$)</Label>
                <Input
                  value={metaFat}
                  onChange={(e) => setMetaFat(e.target.value)}
                  inputMode="decimal"
                  placeholder="Opcional"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de gasto (R$)</Label>
                <Input
                  value={limiteGastoStr}
                  onChange={(e) => setLimiteGastoStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="Opcional"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta de quantidade vendida</Label>
                <Input
                  value={metaQtd}
                  onChange={(e) => setMetaQtd(e.target.value)}
                  inputMode="decimal"
                  placeholder="Opcional — soma das quantidades das vendas"
                  className="h-12 text-base"
                />
              </div>

              <Button onClick={handleSave} className="w-full h-12 text-base">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {culturas.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Cadastre culturas primeiro"
          description="É necessário ter culturas (e opcionalmente safras) para definir metas"
        />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Nenhuma meta definida"
          description="Defina metas de faturamento, limite de gasto ou quantidade vendida por cultura ou safra"
        />
      ) : (
        <div className="space-y-3">
          {lista.map((m) => (
            <div key={m.id} className="rounded-xl bg-card border border-border p-4 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{labelCard(m)}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{resumoMeta(m)}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpen(m)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} aria-label="Excluir">
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
