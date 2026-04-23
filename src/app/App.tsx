import { BrowserRouter, Navigate, useRoutes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PropriedadeProvider, usePropriedade } from "@/contexts/PropriedadeContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { AppRoutes } from "./routes";

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}

function UnauthenticatedRoutes() {
  return useRoutes([
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
    { path: "*", element: <Navigate to="/login" replace /> },
  ]);
}

function AuthenticatedRoutes() {
  const { propriedades, ready } = usePropriedade();
  if (!ready) return <LoadingScreen />;
  const hasSetup = propriedades.length > 0;
  return <AppRoutes hasSetup={hasSetup} />;
}

function Shell() {
  const { ready, token } = useAuth();
  if (!ready) return <LoadingScreen />;
  if (!token) return <UnauthenticatedRoutes />;
  return (
    <PropriedadeProvider>
      <AuthenticatedRoutes />
    </PropriedadeProvider>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
};

export default App;
