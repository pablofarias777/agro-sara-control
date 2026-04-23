import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Leaf,
  Package,
  Sprout,
  DollarSign,
  ShoppingCart,
  Target,
  Calculator,
  Download,
  Settings,
} from "lucide-react";
import { PropriedadeSwitcher } from "@/components/PropriedadeSwitcher";

const sideItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/culturas", icon: Leaf, label: "Culturas" },
  { to: "/insumos", icon: Package, label: "Insumos" },
  { to: "/safras", icon: Sprout, label: "Safras" },
  { to: "/despesas", icon: DollarSign, label: "Despesas" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/simulacao-lucro", icon: Calculator, label: "Simulação" },
  { to: "/exportar", icon: Download, label: "Relatórios" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="hidden md:sticky md:top-0 md:h-screen md:flex md:w-56 lg:w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-4 space-y-3 border-b border-border/80">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="AgroGestão" className="h-9 w-9 rounded-lg" />
          <span className="text-lg font-bold tracking-tight">AgroGestão</span>
        </div>
        <PropriedadeSwitcher className="w-full" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {sideItems.map(({ to, icon: Icon, label }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
