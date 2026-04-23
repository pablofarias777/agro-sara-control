import { useEffect, useMemo, useState } from "react";
import { computeAlerts, type AlertItem } from "@/domain/alerts";
import { defaultLast30Period } from "@/lib/dates";
import { today } from "@/lib/format";
import { getCulturas, getDespesas, getSafras, getVendas, getAllEtapasSafra } from "@/infra/storage";

function filtrarPorPropriedade<T extends { propriedadeId?: string }>(
  rows: T[],
  propriedadeId: string | undefined
): T[] {
  if (!propriedadeId) return rows;
  return rows.filter((r) => r.propriedadeId === propriedadeId);
}

export function useAlerts(financePeriod?: { start: string; end: string }, propriedadeId?: string | null) {
  const period = useMemo(
    () => financePeriod ?? defaultLast30Period(today()),
    [financePeriod?.start, financePeriod?.end]
  );
  const [items, setItems] = useState<AlertItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [despesas, vendas, safras, etapas, culturas] = await Promise.all([
        getDespesas(),
        getVendas(),
        getSafras(),
        getAllEtapasSafra(),
        getCulturas(),
      ]);
      if (cancelled) return;
      const pid = propriedadeId ?? undefined;
      const culturasF = filtrarPorPropriedade(culturas, pid);
      const safrasF = pid ? safras.filter((s) => s.propriedadeId === pid) : safras;
      const safraIds = new Set(safrasF.map((s) => s.id));
      const etapasF = pid ? etapas.filter((e) => safraIds.has(e.safraId)) : etapas;
      setItems(
        computeAlerts({
          today: today(),
          financePeriod: period,
          despesas: filtrarPorPropriedade(despesas, pid),
          vendas: filtrarPorPropriedade(vendas, pid),
          safras: safrasF,
          etapas: etapasF,
          culturas: culturasF,
        })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [period.start, period.end, propriedadeId]);

  return items;
}
