import { useState, useEffect } from "react";
import { Calendar, Users, DollarSign, BarChart3, Home, Settings, LogOut, PawPrint, Package, BookOpen, FileText, BedDouble, Bell, ShoppingCart, Wrench, Receipt, Users2, Trash2, CreditCard, Truck, ShieldCheck, LifeBuoy, Apple, ClipboardList } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTeamRole } from "@/hooks/useTeamRole";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useVertical } from "@/hooks/useVertical";
import { useCurrentClinicId } from "@/hooks/useCurrentClinicId";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import type { VerticalId } from "@/verticals";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof Home;
  perm: string;
  /** Verticais em que o item aparece. Indefinido = todas. */
  verticals?: VerticalId[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const buildMenuGroups = (vertical: VerticalId, subjectPlural: string, clientPlural: string): MenuGroup[] => [
  {
    label: "Principal",
    items: [
      { title: "Início", url: "/dashboard", icon: Home, perm: "agenda" },
      { title: "Agenda", url: "/dashboard/agenda", icon: Calendar, perm: "agenda" },
      { title: "Lembretes", url: "/dashboard/lembretes", icon: Bell, perm: "lembretes" },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { title: clientPlural, url: "/dashboard/clientes", icon: Users, perm: "clientes" },
      { title: "Animais", url: "/dashboard/animais", icon: PawPrint, perm: "animais", verticals: ["vet"] },
      { title: "Pacientes", url: "/dashboard/pacientes", icon: Apple, perm: "clientes", verticals: ["nutri"] },
      { title: "Documentos", url: "/dashboard/documentos", icon: FileText, perm: "documentos" },
      { title: "Internação", url: "/dashboard/internacao", icon: BedDouble, perm: "internacao", verticals: ["vet"] },
      { title: "Bulário", url: "/dashboard/bulario", icon: BookOpen, perm: "bulario", verticals: ["vet"] },
      { title: "Protocolos", url: "/dashboard/protocolos", icon: ClipboardList, perm: "bulario", verticals: ["vet"] },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Caixa", url: "/dashboard/caixa", icon: ShoppingCart, perm: "caixa" },
      { title: "Serviços", url: "/dashboard/servicos", icon: Wrench, perm: "servicos" },
      { title: "Estoque", url: "/dashboard/estoque", icon: Package, perm: "estoque" },
      { title: "Fornecedores", url: "/dashboard/fornecedores", icon: Truck, perm: "fornecedores" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/dashboard/financeiro", icon: DollarSign, perm: "financeiro" },
      { title: "Contas a Pagar", url: "/dashboard/contas", icon: Receipt, perm: "contas" },
      { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3, perm: "relatorios" },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Equipe", url: "/dashboard/funcionarios", icon: Users2, perm: "funcionarios" },
      { title: "Configurações", url: "/dashboard/configuracoes", icon: Settings, perm: "configuracoes" },
      { title: "Lixeira", url: "/dashboard/lixeira", icon: Trash2, perm: "lixeira" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const { clinicId } = useCurrentClinicId();
  const { role, permissions, loading: roleLoading } = useTeamRole();
  const { isAdmin } = usePlatformAdmin();
  const { vertical, verticalId } = useVertical();
  const location = useLocation();

  const [presaleCount, setPresaleCount] = useState(0);

  useEffect(() => {
    const effectiveUserId = clinicId ?? user?.id ?? "";
    if (!effectiveUserId) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from("pet_presales" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", effectiveUserId)
        .in("status", ["pending", "sent_to_cash"]);
      setPresaleCount(count ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`presales-badge-${effectiveUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pet_presales", filter: `user_id=eq.${effectiveUserId}` }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, user?.id]);

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const isItemVisible = (item: MenuItem) => {
    if (item.verticals && !item.verticals.includes(verticalId)) return false;
    if (item.url === "/dashboard") return true;
    if (roleLoading) return true;
    if (role === "owner") return true;
    return !!permissions[item.perm];
  };

  const menuGroups = buildMenuGroups(verticalId, vertical.subjectPluralLabel, vertical.clientPluralLabel);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo size="md" showWordmark={!collapsed} />
        </div>
        {!collapsed && (
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 px-1">
            {vertical.brand}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => {
          const items = group.items.filter(isItemVisible);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isCaixa = item.url === "/dashboard/caixa";
                    const showBadge = isCaixa && presaleCount > 0;
                    return (
                      <SidebarMenuItem key={item.title} className={showBadge && collapsed ? "relative" : ""}>
                        <SidebarMenuButton asChild isActive={isActive(item.url)}>
                          <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                            {!collapsed && showBadge && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
                                {presaleCount > 99 ? "99+" : presaleCount}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        {collapsed && showBadge && (
                          <span className="pointer-events-none absolute -top-0.5 right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {(role === "owner" || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Conta</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {role === "owner" && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/dashboard/meu-plano")}>
                      <NavLink to="/dashboard/meu-plano" className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                        <CreditCard className="h-4 w-4" />
                        {!collapsed && <span>Meu Plano</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin" className="hover:bg-muted/50 text-primary" activeClassName="bg-primary/10 font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        {!collapsed && <span>Painel Suporte</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {!collapsed && (
            <SidebarMenuItem>
              <a
                href="https://wa.me/5511935051843"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 mx-2 my-1 px-2 py-2 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors text-xs"
                title="Falar com o suporte no WhatsApp"
              >
                <LifeBuoy className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">Precisa de ajuda?</div>
                  <div className="text-primary truncate">Falar no WhatsApp</div>
                </div>
              </a>
            </SidebarMenuItem>
          )}
          {collapsed && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild title="Suporte: WhatsApp">
                <a href="https://wa.me/5511935051843" target="_blank" rel="noopener noreferrer" className="text-primary">
                  <LifeBuoy className="h-4 w-4" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
