import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { ShieldCheck, Users, Upload, ScrollText, ArrowLeft } from "lucide-react";
import { PlatformAdminGate } from "@/components/admin/PlatformAdminGate";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/admin", icon: Users, label: "Clientes", end: true },
  { to: "/admin/import", icon: Upload, label: "Importar Excel" },
  { to: "/admin/audit", icon: ScrollText, label: "Auditoria" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  return (
    <PlatformAdminGate>
      <div className="min-h-screen flex bg-background">
        <aside className="w-60 border-r bg-card flex flex-col">
          <div className="p-4 border-b flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <div className="font-bold leading-none">System Hub</div>
              <div className="text-xs text-muted-foreground">Painel de suporte</div>
            </div>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`
                }
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao app
            </Button>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </PlatformAdminGate>
  );
}
