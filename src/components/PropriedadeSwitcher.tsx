import { usePropriedade } from "@/contexts/PropriedadeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Se true, mostra só o nome quando há uma única propriedade (sem select) */
  compact?: boolean;
};

export function PropriedadeSwitcher({ className, compact }: Props) {
  const { propriedades, propriedadeAtivaId, setPropriedadeAtivaId, ready } = usePropriedade();

  if (!ready || propriedades.length === 0) return null;

  if (propriedades.length === 1) {
    return (
      <div className={cn("flex items-center gap-2 min-w-0 text-muted-foreground", className)}>
        <Building2 className="h-4 w-4 shrink-0" />
        <span className={cn("text-sm truncate", compact && "text-xs")}>{propriedades[0].nomePropriedade}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 min-w-0 max-w-full", className)}>
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
      <Select value={propriedadeAtivaId ?? undefined} onValueChange={setPropriedadeAtivaId}>
        <SelectTrigger className={cn("h-9 min-w-[140px] max-w-[min(100%,280px)]", compact && "h-8 text-xs")}>
          <SelectValue placeholder="Propriedade" />
        </SelectTrigger>
        <SelectContent>
          {propriedades.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nomePropriedade}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
