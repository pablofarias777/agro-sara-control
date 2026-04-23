import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import { getInsumos, saveInsumo, deleteInsumo } from "@/infra/storage";
import type { CategoriaInsumo, Insumo, UnidadeInsumo } from "@/domain/types";
import { CATEGORIA_INSUMO_LABELS, UNIDADE_INSUMO_LABELS } from "@/domain/labels";
import { createId } from "@/lib/id";
import { formatQuantidade, parseDecimalInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";

function isEstoqueBaixo(i: Insumo): boolean {
  return i.quantidadeAtual <= i.alertaEstoqueBaixo;
}

export default function InsumosPage() {
  const [lista, setLista] = useState<Insumo[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<CategoriaInsumo>("outros");
  const [unidade, setUnidade] = useState<UnidadeInsumo>("kg");
  const [quantidadeStr, setQuantidadeStr] = useState("0");
  const [alertaStr, setAlertaStr] = useState("0");

  const load = async () => setLista(await getInsumos());
  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setNome("");
    setCategoria("outros");
    setUnidade("kg");
    setQuantidadeStr("0");
    setAlertaStr("0");
    setEditing(null);
  };

  const handleOpen = (i?: Insumo) => {
    if (i) {
      setEditing(i);
      setNome(i.nome);
      setCategoria(i.categoria);
      setUnidade(i.unidade);
      setQuantidadeStr(String(i.quantidadeAtual).replace(".", ","));
      setAlertaStr(String(i.alertaEstoqueBaixo).replace(".", ","));
    } else reset();
    setOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) return;
    const qtd = parseDecimalInput(quantidadeStr || "0");
    const alerta = parseDecimalInput(alertaStr || "0");
    if (Number.isNaN(qtd) || qtd < 0) return;
    if (Number.isNaN(alerta) || alerta < 0) return;
    await saveInsumo({
      id: editing?.id || createId(),
      nome: nome.trim(),
      categoria,
      unidade,
      quantidadeAtual: qtd,
      alertaEstoqueBaixo: alerta,
    });
    setOpen(false);
    reset();
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este insumo?")) {
      await deleteInsumo(id);
      load();
    }
  };

  return (
    <Layout title="Estoque de insumos">
      <div className="flex justify-end mb-4">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => handleOpen()} className="h-12 gap-2">
              <Plus className="h-5 w-5" /> Novo insumo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar insumo" : "Novo insumo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Ureia granulada"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaInsumo)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORIA_INSUMO_LABELS) as CategoriaInsumo[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {CATEGORIA_INSUMO_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={unidade} onValueChange={(v) => setUnidade(v as UnidadeInsumo)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(UNIDADE_INSUMO_LABELS) as UnidadeInsumo[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {UNIDADE_INSUMO_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade atual</Label>
                <Input
                  value={quantidadeStr}
                  onChange={(e) => setQuantidadeStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>Alerta de estoque baixo</Label>
                <p className="text-xs text-muted-foreground">
                  Avisa quando a quantidade atual for menor ou igual a este valor (na mesma unidade).
                </p>
                <Input
                  value={alertaStr}
                  onChange={(e) => setAlertaStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
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

      {lista.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Nenhum insumo cadastrado"
          description="Cadastre insumos para acompanhar quantidade e alertas de baixo estoque"
        />
      ) : (
        <div className="space-y-3">
          {lista.map((i) => (
            <div
              key={i.id}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
                isEstoqueBaixo(i) ? "border-destructive/30 bg-destructive/5" : "bg-card border-border"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{i.nome}</span>
                  {isEstoqueBaixo(i) && (
                    <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                      Estoque baixo
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {CATEGORIA_INSUMO_LABELS[i.categoria]} · {UNIDADE_INSUMO_LABELS[i.unidade]}
                </div>
                <div className="text-sm mt-2">
                  <span className="text-muted-foreground">Quantidade: </span>
                  <span className="font-medium tabular-nums">
                    {formatQuantidade(i.quantidadeAtual)} {i.unidade}
                  </span>
                  <span className="text-muted-foreground mx-2">·</span>
                  <span className="text-muted-foreground">Alerta: </span>
                  <span className="font-medium tabular-nums">
                    {formatQuantidade(i.alertaEstoqueBaixo)} {i.unidade}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpen(i)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(i.id)} aria-label="Excluir">
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
