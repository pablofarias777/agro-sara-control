import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type FiltersPanelProps = {
  children: React.ReactNode;
  onClear?: () => void;
  className?: string;
};

/** Painel de filtros com layout consistente entre telas */
export function FiltersPanel({ children, onClear, className }: FiltersPanelProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-muted/25 p-3 sm:p-4 mb-4", className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filtros</span>
        {onClear && (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={onClear}>
            Limpar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

export function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5 min-w-0", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
