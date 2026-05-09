import { useMemo } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import Setup from "@/pages/Setup";
import Dashboard from "@/pages/Dashboard";
import Culturas from "@/pages/Culturas";
import Insumos from "@/pages/Insumos";
import Safras from "@/pages/Safras";
import Despesas from "@/pages/Despesas";
import Vendas from "@/pages/Vendas";
import Exportar from "@/pages/Exportar";
import Metas from "@/pages/Metas";
import SimulacaoLucro from "@/pages/SimulacaoLucro";
import Configuracoes from "@/pages/Configuracoes";
import Mais from "@/pages/Mais";
import NotFound from "@/pages/NotFound";
import { FALLBACK_PATH, ROUTES } from "./paths";

export function AppRoutes({ hasSetup }: { hasSetup: boolean }) {
  const routeObjects = useMemo(
    () =>
      hasSetup
        ? [
            { path: ROUTES.root, element: <Dashboard /> },
            { path: ROUTES.culturas, element: <Culturas /> },
            { path: ROUTES.insumos, element: <Insumos /> },
            { path: ROUTES.safras, element: <Safras /> },
            { path: ROUTES.despesas, element: <Despesas /> },
            { path: ROUTES.vendas, element: <Vendas /> },
            { path: ROUTES.metas, element: <Metas /> },
            { path: ROUTES.simulacaoLucro, element: <SimulacaoLucro /> },
            { path: ROUTES.exportar, element: <Exportar /> },
            { path: ROUTES.configuracoes, element: <Configuracoes /> },
            { path: ROUTES.mais, element: <Mais /> },
            { path: ROUTES.setup, element: <Navigate to={ROUTES.root} replace /> },
            { path: FALLBACK_PATH, element: <NotFound /> },
          ]
        : [
            { path: ROUTES.setup, element: <Setup /> },
            { path: FALLBACK_PATH, element: <Navigate to={ROUTES.setup} replace /> },
          ],
    [hasSetup]
  );

  return useRoutes(routeObjects);
}
