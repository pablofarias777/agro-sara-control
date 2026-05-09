import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Leaf, DollarSign, ShoppingCart, Menu } from "lucide-react";
import { ROUTES } from "@/app/paths";

const navItems = [
  { to: ROUTES.root, icon: LayoutDashboard, label: "Início" },
  { to: ROUTES.culturas, icon: Leaf, label: "Culturas" },
  { to: ROUTES.despesas, icon: DollarSign, label: "Despesas" },
  { to: ROUTES.vendas, icon: ShoppingCart, label: "Vendas" },
  { to: ROUTES.mais, icon: Menu, label: "Mais" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom md:hidden">
      <div className="flex items-center justify-around py-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = to === ROUTES.root ? pathname === ROUTES.root : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
