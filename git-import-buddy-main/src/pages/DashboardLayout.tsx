import { Outlet, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { SubscriptionStatusChip } from "@/components/dashboard/SubscriptionStatusChip";
import { VetAssistant } from "@/components/assistant/VetAssistant";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

export default function DashboardLayout() {
  const { isAdmin, loading, actingAs } = usePlatformAdmin();
  // Platform admins do not have an own clinic dashboard; send them to the support panel
  // unless they are impersonating a client.
  if (!loading && isAdmin && !actingAs) {
    return <Navigate to="/admin" replace />;
  }
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-background px-4 gap-3">
            <SidebarTrigger />
            <SubscriptionStatusChip />
          </header>
          <ImpersonationBanner />
          <SubscriptionBanner />
          <main className="flex-1 p-4 md:p-6 pb-28 md:pb-32 overflow-auto">
            <Outlet />
          </main>
        </div>
        <VetAssistant />
      </div>
    </SidebarProvider>
  );
}


