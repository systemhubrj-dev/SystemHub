import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import Index from "./pages/Index";
import BularioPublico from "./pages/BularioPublico";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Agenda from "./pages/dashboard/Agenda";
import Clientes from "./pages/dashboard/Clientes";
import Animais from "./pages/dashboard/Animais";
import PetProfile from "./pages/dashboard/PetProfile";
import Estoque from "./pages/dashboard/Estoque";
import Bulario from "./pages/dashboard/Bulario";
import Financeiro from "./pages/dashboard/Financeiro";
import Relatorios from "./pages/dashboard/Relatorios";
import Configuracoes from "./pages/dashboard/Configuracoes";
import MeuPlano from "./pages/dashboard/MeuPlano";
import Documentos from "./pages/dashboard/Documentos";
import Internacao from "./pages/dashboard/Internacao";
import Lembretes from "./pages/dashboard/Lembretes";
import Caixa from "./pages/dashboard/Caixa";
import Servicos from "./pages/dashboard/Servicos";
import ContasPagar from "./pages/dashboard/ContasPagar";
import Funcionarios from "./pages/dashboard/Funcionarios";
import Fornecedores from "./pages/dashboard/Fornecedores";
import Lixeira from "./pages/dashboard/Lixeira";
import Pacientes from "./pages/dashboard/Pacientes";
import PacienteProfile from "./pages/dashboard/PacienteProfile";
import { PlanGate } from "@/components/billing/PlanGate";
import { RoleGate } from "@/components/RoleGate";
import { PlatformAdminProvider } from "@/hooks/usePlatformAdmin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminClients from "./pages/admin/AdminClients";
import AdminImport from "./pages/admin/AdminImport";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import { PlatformAdminGate } from "@/components/admin/PlatformAdminGate";
import { usePageTracking } from "./hooks/usePageTracking";
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
            <Routes>
              <Route path="/" element={<BularioPublico />} />
              <Route path="/sobre" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<ProtectedRoute><PlatformAdminGate><AdminLayout /></PlatformAdminGate></ProtectedRoute>}>
                <Route index element={<AdminClients />} />
                <Route path="import" element={<AdminImport />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<DashboardHome />} />
                <Route path="agenda" element={<Agenda />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="animais" element={<Animais />} />
                <Route path="animais/:id" element={<PetProfile />} />
                <Route path="pacientes" element={<Pacientes />} />
                <Route path="pacientes/:id" element={<PacienteProfile />} />
                <Route path="estoque" element={<Estoque />} />
                <Route path="servicos" element={<Servicos />} />
                <Route path="caixa" element={<Caixa />} />
                <Route path="bulario" element={<Bulario />} />
                <Route path="documentos" element={<Documentos />} />
                <Route path="internacao" element={<PlanGate feature="internacao"><Internacao /></PlanGate>} />
                <Route path="lembretes" element={<Lembretes />} />
                <Route path="financeiro" element={<RoleGate roles={["owner"]}><Financeiro /></RoleGate>} />
                <Route path="relatorios" element={<RoleGate roles={["owner"]}><PlanGate feature="relatorios_avancados"><Relatorios /></PlanGate></RoleGate>} />
                <Route path="configuracoes" element={<RoleGate roles={["owner"]}><Configuracoes /></RoleGate>} />
                <Route path="contas" element={<RoleGate roles={["owner"]}><ContasPagar /></RoleGate>} />
                <Route path="fornecedores" element={<Fornecedores />} />
                <Route path="funcionarios" element={<RoleGate roles={["owner"]}><PlanGate feature="funcionarios"><Funcionarios /></PlanGate></RoleGate>} />
                <Route path="lixeira" element={<RoleGate roles={["owner"]}><Lixeira /></RoleGate>} />
                <Route path="meu-plano" element={<RoleGate roles={["owner"]}><MeuPlano /></RoleGate>} />
                <Route path="plano" element={<RoleGate roles={["owner"]}><MeuPlano /></RoleGate>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </PlatformAdminProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppErrorBoundary>
  </QueryClientProvider>
);

export default App;
