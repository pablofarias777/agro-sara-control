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

export function AppRoutes({ hasSetup }: { hasSetup: boolean }) {
  const routeObjects = useMemo(
    () =>
      hasSetup
        ? [
            { path: "/", element: <Dashboard /> },
            { path: "/culturas", element: <Culturas /> },
            { path: "/insumos", element: <Insumos /> },
            { path: "/safras", element: <Safras /> },
            { path: "/despesas", element: <Despesas /> },
            { path: "/vendas", element: <Vendas /> },
            { path: "/metas", element: <Metas /> },
            { path: "/simulacao-lucro", element: <SimulacaoLucro /> },
            { path: "/exportar", element: <Exportar /> },
            { path: "/configuracoes", element: <Configuracoes /> },
            { path: "/mais", element: <Mais /> },
            { path: "/setup", element: <Navigate to="/" replace /> },
            { path: "*", element: <NotFound /> },
          ]
        : [
            { path: "/setup", element: <Setup /> },
            { path: "*", element: <Navigate to="/setup" replace /> },
          ],
    [hasSetup]
  );

  return useRoutes(routeObjects);
}
