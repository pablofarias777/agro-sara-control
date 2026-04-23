import { useMemo, useState } from "react";
import type { EtapaCalendarioSafra, TipoEtapaSafra } from "@/domain/types";
import { ETAPA_SAFRA_LABELS } from "@/domain/labels";
import { formatDate, today } from "@/lib/format";
import { createId } from "@/lib/id";
import { saveEtapaSafra, deleteEtapaSafra } from "@/infra/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarDays, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  safraId: string;
  etapas: EtapaCalendarioSafra[];
  onReload: () => void;
};

export function SafraCalendarioSection({ safraId, etapas, onReload }: Props) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoEtapaSafra>("plantio");
  const [dataPrevista, setDataPrevista] = useState(() => today());
  const [observacao, setObservacao] = useState("");

  const sorted = useMemo(
    () => [...etapas].sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista)),
    [etapas]
  );

  const resetForm = () => {
    setTipo("plantio");
    setDataPrevista(today());
    setObservacao("");
  };

  const handleAdd = async () => {
    if (!dataPrevista) return;
    await saveEtapaSafra({
      id: createId(),
      safraId,
      tipo,
      dataPrevista,
      concluida: false,
      observacao: observacao.trim() || undefined,
    });
    setDialogOpen(false);
    resetForm();
    onReload();
  };

  const toggleConcluida = async (e: EtapaCalendarioSafra) => {
    const next = !e.concluida;
    await saveEtapaSafra({
      ...e,
      concluida: next,
      concluidaEm: next ? today() : undefined,
    });
    onReload();
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remover esta etapa do calendário?")) return;
    await deleteEtapaSafra(id);
    onReload();
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3 border-t border-border pt-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
            Calendário agrícola
            {etapas.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({etapas.length})</span>
            )}
          </span>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        <div className="flex justify-end">
          <Dialog
            open={dialogOpen}
            onOpenChange={(v) => {
              setDialogOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Nova etapa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova etapa no calendário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEtapaSafra)}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ETAPA_SAFRA_LABELS) as TipoEtapaSafra[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {ETAPA_SAFRA_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data prevista</Label>
                  <Input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Observação (opcional)</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex.: adubo NPK, produto X..."
                    className="min-h-[80px] resize-none"
                  />
                </div>
                <Button onClick={handleAdd} className="w-full h-12 text-base">
                  Salvar etapa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground px-0.5">Nenhuma etapa cadastrada. Adicione plantio, adubação, irrigação, aplicação ou colheita.</p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "rounded-lg border border-border bg-muted/30 p-3 flex gap-3 items-start",
                  e.concluida && "opacity-80"
                )}
              >
                <div className="pt-0.5">
                  <Checkbox
                    checked={e.concluida}
                    onCheckedChange={() => toggleConcluida(e)}
                    aria-label={e.concluida ? "Marcar como pendente" : "Marcar como concluída"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "font-medium text-sm",
                      e.concluida && "line-through text-muted-foreground"
                    )}
                  >
                    {ETAPA_SAFRA_LABELS[e.tipo]}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(e.dataPrevista)}
                    {e.concluida && e.concluidaEm && (
                      <span className="ml-2 text-muted-foreground/90">· Concluída em {formatDate(e.concluidaEm)}</span>
                    )}
                  </div>
                  {e.observacao && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{e.observacao}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleRemove(e.id)}
                  aria-label="Remover etapa"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
