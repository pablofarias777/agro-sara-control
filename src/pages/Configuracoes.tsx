import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { deletePropriedade, getPropriedadeById, savePropriedade } from "@/infra/storage";
import { useAuth } from "@/contexts/AuthContext";
import type { Propriedade } from "@/domain/types";
import { usePropriedade } from "@/contexts/PropriedadeContext";
import { useNavigate } from "react-router-dom";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Configuracoes() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { propriedades, propriedadeAtivaId, setPropriedadeAtivaId, refreshPropriedades } = usePropriedade();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [produtor, setProdutor] = useState("");
  const [openNova, setOpenNova] = useState(false);
  const [nomeNova, setNomeNova] = useState("");
  const [produtorNova, setProdutorNova] = useState("");

  useEffect(() => {
    const id = editandoId ?? propriedadeAtivaId;
    if (!id) {
      setNome("");
      setProdutor("");
      return;
    }
    getPropriedadeById(id).then((p) => {
      if (p) {
        setNome(p.nomePropriedade);
        setProdutor(p.nomeProdutor);
      }
    });
  }, [editandoId, propriedadeAtivaId]);

  const propEmEdicao = editandoId ?? propriedadeAtivaId;
  const dadosEmEdicao = propriedades.find((p) => p.id === propEmEdicao);

  const handleSave = async () => {
    if (!dadosEmEdicao || !nome.trim() || !produtor.trim()) return;
    await savePropriedade({
      ...dadosEmEdicao,
      nomePropriedade: nome.trim(),
      nomeProdutor: produtor.trim(),
    });
    await refreshPropriedades();
    toast.success("Dados salvos!");
  };

  const handleNova = async () => {
    if (!nomeNova.trim() || !produtorNova.trim()) return;
    const id = createId();
    await savePropriedade({
      id,
      nomePropriedade: nomeNova.trim(),
      nomeProdutor: produtorNova.trim(),
      criadoEm: new Date().toISOString().slice(0, 10),
    });
    setOpenNova(false);
    setNomeNova("");
    setProdutorNova("");
    await refreshPropriedades();
    setPropriedadeAtivaId(id);
    setEditandoId(null);
    toast.success("Propriedade criada!");
  };

  const handleExcluir = async (id: string) => {
    const p = propriedades.find((x) => x.id === id);
    if (!p) return;
    if (!confirm(`Excluir "${p.nomePropriedade}"? Só é possível se não houver culturas, safras, despesas ou vendas vinculadas.`)) return;
    const r = await deletePropriedade(id);
    if (r === "tem-dados") {
      toast.error("Não é possível excluir: ainda existem dados vinculados a esta propriedade.");
      return;
    }
    await refreshPropriedades();
    if (editandoId === id) setEditandoId(null);
    toast.success("Propriedade removida.");
  };

  return (
    <Layout title="Configurações">
      <div className="max-w-lg space-y-6">
        <p className="text-sm text-muted-foreground">
          Cada propriedade mantém culturas, safras e lançamentos separados. Os dados são salvos no servidor (API + MySQL)
          da sua conta.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Dialog open={openNova} onOpenChange={setOpenNova}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                <Plus className="h-4 w-4" /> Nova propriedade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova propriedade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nome da propriedade</Label>
                  <Input
                    value={nomeNova}
                    onChange={(e) => setNomeNova(e.target.value)}
                    placeholder="Ex: Fazenda Santa Rita"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do produtor</Label>
                  <Input
                    value={produtorNova}
                    onChange={(e) => setProdutorNova(e.target.value)}
                    placeholder="Ex: Maria Souza"
                    className="h-11"
                  />
                </div>
                <Button onClick={handleNova} className="w-full h-11">
                  Criar e selecionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Suas propriedades</Label>
          <ul className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
            {propriedades.map((p) => (
              <li key={p.id} className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(p.id);
                    setPropriedadeAtivaId(p.id);
                  }}
                  className={cn(
                    "flex-1 flex items-center gap-2 text-left min-w-0 rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                    (editandoId ?? propriedadeAtivaId) === p.id ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate">{p.nomePropriedade}</span>
                  {p.id === propriedadeAtivaId && (
                    <span className="text-[10px] uppercase tracking-wide text-primary shrink-0">Ativa</span>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleExcluir(p.id)}
                  disabled={propriedades.length <= 1}
                  title={propriedades.length <= 1 ? "Mantenha ao menos uma propriedade" : "Excluir propriedade vazia"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {dadosEmEdicao && (
          <div className="space-y-4 pt-2 border-t border-border">
            <h2 className="text-sm font-semibold">Editar propriedade</h2>
            <div className="space-y-2">
              <Label>Nome da propriedade</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label>Nome do produtor</Label>
              <Input value={produtor} onChange={(e) => setProdutor(e.target.value)} className="h-12 text-base" />
            </div>
            <Button onClick={handleSave} className="h-12 text-base">
              Salvar alterações
            </Button>
          </div>
        )}

        <div className="pt-6 border-t border-border space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Sair da conta
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>AgroGestão Simples v1.0</p>
            <p>Dados no servidor MySQL via API.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
