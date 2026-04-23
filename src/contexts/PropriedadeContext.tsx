import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Propriedade } from "@/domain/types";
import { getPropriedades } from "@/infra/storage";
import { STORAGE_KEY_PROPRIEDADE_ATIVA } from "@/lib/propriedadeAtiva";

type PropriedadeContextValue = {
  propriedades: Propriedade[];
  propriedadeAtiva: Propriedade | null;
  propriedadeAtivaId: string | null;
  setPropriedadeAtivaId: (id: string) => void;
  refreshPropriedades: () => Promise<void>;
  ready: boolean;
};

const PropriedadeContext = createContext<PropriedadeContextValue | null>(null);

export function PropriedadeProvider({ children }: { children: ReactNode }) {
  const [propriedades, setPropriedades] = useState<Propriedade[]>([]);
  const [propriedadeAtivaId, setPropriedadeAtivaIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refreshPropriedades = useCallback(async () => {
    try {
      const list = await getPropriedades();
      setPropriedades(list);
      const stored = localStorage.getItem(STORAGE_KEY_PROPRIEDADE_ATIVA);
      const valid = stored && list.some((p) => p.id === stored);
      if (valid) {
        setPropriedadeAtivaIdState(stored);
      } else if (list.length > 0) {
        const first = list[0].id;
        localStorage.setItem(STORAGE_KEY_PROPRIEDADE_ATIVA, first);
        setPropriedadeAtivaIdState(first);
      } else {
        setPropriedadeAtivaIdState(null);
      }
    } catch (e) {
      console.error("refreshPropriedades:", e);
      setPropriedades([]);
      setPropriedadeAtivaIdState(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refreshPropriedades();
  }, [refreshPropriedades]);

  const setPropriedadeAtivaId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY_PROPRIEDADE_ATIVA, id);
    setPropriedadeAtivaIdState(id);
  }, []);

  const propriedadeAtiva = useMemo(
    () => propriedades.find((p) => p.id === propriedadeAtivaId) ?? null,
    [propriedades, propriedadeAtivaId]
  );

  const value = useMemo(
    () => ({
      propriedades,
      propriedadeAtiva,
      propriedadeAtivaId,
      setPropriedadeAtivaId,
      refreshPropriedades,
      ready,
    }),
    [propriedades, propriedadeAtiva, propriedadeAtivaId, setPropriedadeAtivaId, refreshPropriedades, ready]
  );

  return <PropriedadeContext.Provider value={value}>{children}</PropriedadeContext.Provider>;
}

export function usePropriedade(): PropriedadeContextValue {
  const ctx = useContext(PropriedadeContext);
  if (!ctx) throw new Error("usePropriedade deve ser usado dentro de PropriedadeProvider");
  return ctx;
}
