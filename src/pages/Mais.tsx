import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Package, Sprout, Target, Calculator, Download, Settings } from "lucide-react";

/** "Mais" page – mobile catch-all for items not in bottom nav */
export default function Mais() {
  const items = [
    { to: "/metas", icon: Target, label: "Metas", desc: "Faturamento, gastos e quantidade por cultura ou safra" },
    {
      to: "/simulacao-lucro",
      icon: Calculator,
      label: "Simulação de lucro",
      desc: "Receita, custo e preço mínimo sem prejuízo",
    },
    { to: "/insumos", icon: Package, label: "Estoque de insumos", desc: "Cadastro e alertas de baixo estoque" },
    { to: "/safras", icon: Sprout, label: "Safras", desc: "Gerencie períodos de plantio" },
    { to: "/exportar", icon: Download, label: "Relatórios e backup", desc: "CSV, relatórios e backup completo" },
    { to: "/configuracoes", icon: Settings, label: "Configurações", desc: "Dados da propriedade" },
  ];

  return (
    <Layout title="Mais">
      <div className="space-y-3">
        {items.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-xl bg-card border border-border p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">{label}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
