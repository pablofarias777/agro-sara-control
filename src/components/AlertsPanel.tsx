import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAlerts } from "@/hooks/useAlerts";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle } from "lucide-react";

type Props = {
  /** Se omitido, usa os últimos 30 dias para as regras financeiras */
  financePeriod?: { start: string; end: string };
  /** Quando informado, restringe alertas à propriedade ativa */
  propriedadeId?: string | null;
  className?: string;
};

export function AlertsPanel({ financePeriod, propriedadeId, className }: Props) {
  const items = useAlerts(financePeriod, propriedadeId);

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)} role="region" aria-label="Alertas">
      {items.map((a) => {
        const isDestructive = a.severity === "destructive";
        return (
          <Alert
            key={a.id}
            variant={isDestructive ? "destructive" : "default"}
            className={cn(
              !isDestructive &&
                "border-warning/40 bg-warning/[0.08] text-foreground [&>svg]:text-warning dark:border-warning/35"
            )}
          >
            {isDestructive ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription className="text-sm leading-snug">{a.message}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
