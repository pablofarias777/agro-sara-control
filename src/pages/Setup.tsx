import { useState } from "react";
import { savePropriedade } from "@/infra/storage";
import { STORAGE_KEY_PROPRIEDADE_ATIVA } from "@/lib/propriedadeAtiva";
import { createId } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprout } from "lucide-react";

export default function Setup() {
  const [nomePropriedade, setNomePropriedade] = useState("");
  const [nomeProdutor, setNomeProdutor] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePropriedade.trim() || !nomeProdutor.trim()) return;
    const id = createId();
    await savePropriedade({
      id,
      nomePropriedade: nomePropriedade.trim(),
      nomeProdutor: nomeProdutor.trim(),
      criadoEm: new Date().toISOString().slice(0, 10),
    });
    localStorage.setItem(STORAGE_KEY_PROPRIEDADE_ATIVA, id);
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Sprout className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">AgroGestão Simples</h1>
          <p className="text-center text-sm text-muted-foreground">Controle financeiro para sua propriedade rural</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propriedade">Nome da Propriedade</Label>
            <Input
              id="propriedade"
              placeholder="Ex: Sítio Boa Esperança"
              value={nomePropriedade}
              onChange={(e) => setNomePropriedade(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="produtor">Nome do Produtor</Label>
            <Input
              id="produtor"
              placeholder="Ex: José da Silva"
              value={nomeProdutor}
              onChange={(e) => setNomeProdutor(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <Button type="submit" className="w-full h-12 text-base font-semibold">
            Começar a usar
          </Button>
        </form>
      </div>
    </div>
  );
}
