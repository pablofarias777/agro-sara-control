import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import { AlertsPanel } from "@/components/AlertsPanel";
import { PropriedadeSwitcher } from "@/components/PropriedadeSwitcher";
import { usePropriedade } from "@/contexts/PropriedadeContext";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const location = useLocation();
  const showGlobalAlerts = location.pathname !== "/";
  const { propriedadeAtivaId, ready } = usePropriedade();
  const mostrarAlertas = showGlobalAlerts && ready && !!propriedadeAtivaId;

  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-4 min-w-0">
        {title && (
          <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h1 className="text-xl font-bold md:text-2xl shrink-0">{title}</h1>
              {ready && propriedadeAtivaId && (
                <div className="md:hidden w-full min-w-0">
                  <PropriedadeSwitcher className="justify-end" compact />
                </div>
              )}
            </div>
          </header>
        )}
        <div className="px-4 py-4 md:px-6 animate-fade-in">
          {mostrarAlertas && <AlertsPanel className="mb-4" propriedadeId={propriedadeAtivaId!} />}
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
