import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { PlanGate } from "@/components/billing/PlanGate";
import { RoleGate } from "@/components/RoleGate";
import { PlatformAdminProvider } from "@/hooks/usePlatformAdmin";
import { PlatformAdminGate } from "@/components/admin/PlatformAdminGate";
import { usePageTracking } from "./hooks/usePageTracking";
import CookieConsent from "./components/CookieConsent";

// ─── Eager (critical path — public + auth) ───────────────────────────────────
import BularioPublico from "./pages/BularioPublico";
import Index from "./pages/Index";
import Planos from "./pages/Planos";
import Privacidade from "./pages/Privacidade";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// ─── Lazy (dashboard — only loaded after login) ───────────────────────────────
const DashboardLayout   = lazy(() => import("./pages/DashboardLayout"));
const DashboardHome     = lazy(() => import("./pages/dashboard/DashboardHome"));
const Agenda            = lazy(() => import("./pages/dashboard/Agenda"));
const Clientes          = lazy(() => import("./pages/dashboard/Clientes"));
const Animais           = lazy(() => import("./pages/dashboard/Animais"));
const PetProfile        = lazy(() => import("./pages/dashboard/PetProfile"));
const Pacientes         = lazy(() => import("./pages/dashboard/Pacientes"));
const PacienteProfile   = lazy(() => import("./pages/dashboard/PacienteProfile"));
const Estoque           = lazy(() => import("./pages/dashboard/Estoque"));
const Servicos          = lazy(() => import("./pages/dashboard/Servicos"));
const Caixa             = lazy(() => import("./pages/dashboard/Caixa"));
const Bulario           = lazy(() => import("./pages/dashboard/Bulario"));
const Documentos        = lazy(() => import("./pages/dashboard/Documentos"));
const Internacao        = lazy(() => import("./pages/dashboard/Internacao"));
const Lembretes         = lazy(() => import("./pages/dashboard/Lembretes"));
const Financeiro        = lazy(() => import("./pages/dashboard/Financeiro"));
const Relatorios        = lazy(() => import("./pages/dashboard/Relatorios"));
const Configuracoes     = lazy(() => import("./pages/dashboard/Configuracoes"));
const ContasPagar       = lazy(() => import("./pages/dashboard/ContasPagar"));
const Funcionarios      = lazy(() => import("./pages/dashboard/Funcionarios"));
const Fornecedores      = lazy(() => import("./pages/dashboard/Fornecedores"));
const Lixeira           = lazy(() => import("./pages/dashboard/Lixeira"));
const MeuPlano          = lazy(() => import("./pages/dashboard/MeuPlano"));

// ─── Lazy (admin — only for platform admins) ─────────────────────────────────
const AdminLayout    = lazy(() => import("./pages/admin/AdminLayout"));
const AdminClients   = lazy(() => import("./pages/admin/AdminClients"));
const AdminImport    = lazy(() => import("./pages/admin/AdminImport"));
const AdminAudit     = lazy(() => import("./pages/admin/AdminAudit"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminBulario      = lazy(() => import("./pages/admin/AdminBulario"));
const AdminProtocolos   = lazy(() => import("./pages/admin/AdminProtocolos"));
const AdminAtivos       = lazy(() => import("./pages/admin/AdminAtivos"));
const Protocolos        = lazy(() => import("./pages/dashboard/Protocolos"));
const ProtocoloDetalhe  = lazy(() => import("./pages/dashboard/ProtocoloDetalhe"));

// ─── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function PageTracker() {
  usePageTracking();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PlatformAdminProvider>
              <PageTracker />
              <CookieConsent />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Public ── */}
                  <Route path="/"                element={<BularioPublico />} />
                  <Route path="/sobre"           element={<Index />} />
                  <Route path="/planos"          element={<Planos />} />
                  <Route path="/login"           element={<Login />} />
                  <Route path="/register"        element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password"  element={<ResetPassword />} />
                  <Route path="/privacidade"     element={<Privacidade />} />
                  <Route path="/protocolos/:id"  element={<ProtocoloDetalhe />} />

                  {/* ── Admin ── */}
                  <Route path="/admin" element={<ProtectedRoute><PlatformAdminGate><AdminLayout /></PlatformAdminGate></ProtectedRoute>}>
                    <Route index        element={<AdminClients />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="ativos"      element={<AdminAtivos />} />
                    <Route path="bulario"     element={<AdminBulario />} />
                    <Route path="protocolos" element={<AdminProtocolos />} />
                    <Route path="import"     element={<AdminImport />} />
                    <Route path="audit"     element={<AdminAudit />} />
                  </Route>

                  {/* ── Dashboard ── */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                    <Route index                  element={<DashboardHome />} />
                    <Route path="agenda"          element={<Agenda />} />
                    <Route path="clientes"        element={<Clientes />} />
                    <Route path="animais"         element={<Animais />} />
                    <Route path="animais/:id"     element={<PetProfile />} />
                    <Route path="pacientes"       element={<Pacientes />} />
                    <Route path="pacientes/:id"   element={<PacienteProfile />} />
                    <Route path="estoque"         element={<Estoque />} />
                    <Route path="servicos"        element={<Servicos />} />
                    <Route path="caixa"           element={<Caixa />} />
                    <Route path="bulario"         element={<Bulario />} />
                    <Route path="protocolos"      element={<Protocolos />} />
                    <Route path="protocolos/:id"  element={<ProtocoloDetalhe />} />
                    <Route path="documentos"      element={<Documentos />} />
                    <Route path="internacao"      element={<PlanGate feature="internacao"><Internacao /></PlanGate>} />
                    <Route path="lembretes"       element={<Lembretes />} />
                    <Route path="financeiro"      element={<RoleGate roles={["owner"]}><Financeiro /></RoleGate>} />
                    <Route path="relatorios"      element={<RoleGate roles={["owner"]}><PlanGate feature="relatorios_avancados"><Relatorios /></PlanGate></RoleGate>} />
                    <Route path="configuracoes"   element={<RoleGate roles={["owner"]}><Configuracoes /></RoleGate>} />
                    <Route path="contas"          element={<RoleGate roles={["owner"]}><ContasPagar /></RoleGate>} />
                    <Route path="fornecedores"    element={<Fornecedores />} />
                    <Route path="funcionarios"    element={<RoleGate roles={["owner"]}><PlanGate feature="funcionarios"><Funcionarios /></PlanGate></RoleGate>} />
                    <Route path="lixeira"         element={<RoleGate roles={["owner"]}><Lixeira /></RoleGate>} />
                    <Route path="meu-plano"       element={<RoleGate roles={["owner"]}><MeuPlano /></RoleGate>} />
                    <Route path="plano"           element={<RoleGate roles={["owner"]}><MeuPlano /></RoleGate>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </PlatformAdminProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppErrorBoundary>
  </QueryClientProvider>
);

export default App;
