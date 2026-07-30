import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Activity, Clock, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface UserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  status: string | null;
  last_sign_in_at: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

function isOnline(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 30 * 60 * 1000; // 30 min window
}

export default function AdminAtivos() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: clientsData, error: clientsErr }, { data: loginData, error: loginErr }] = await Promise.all([
        supabase.functions.invoke("admin-list-clients"),
        supabase.rpc("admin_user_last_login" as any),
      ]);
      if (clientsErr) throw clientsErr;
      if (loginErr) throw loginErr;

      const loginMap = new Map<string, string>(
        ((loginData as any[]) ?? []).map((r: any) => [r.user_id, r.last_sign_in_at])
      );

      const clients: UserRow[] = ((clientsData as any)?.clients ?? [])
        .filter((c: UserRow) => !c.email?.toLowerCase().endsWith("systemhubrj@gmail.com"))
        .map((c: UserRow) => ({ ...c, last_sign_in_at: loginMap.get(c.user_id) ?? c.last_sign_in_at ?? null }));

      clients.sort((a, b) => {
        if (!a.last_sign_in_at) return 1;
        if (!b.last_sign_in_at) return -1;
        return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime();
      });
      setRows(clients);
      setLastRefresh(new Date());
    } catch (e: any) {
      toast.error("Erro ao carregar: " + (e?.message ?? "erro"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const today = rows.filter(
    (r) => r.last_sign_in_at && Date.now() - new Date(r.last_sign_in_at).getTime() < 24 * 60 * 60 * 1000
  );
  const week = rows.filter(
    (r) => r.last_sign_in_at &&
      Date.now() - new Date(r.last_sign_in_at).getTime() >= 24 * 60 * 60 * 1000 &&
      Date.now() - new Date(r.last_sign_in_at).getTime() < 7 * 24 * 60 * 60 * 1000
  );
  const older = rows.filter(
    (r) => !r.last_sign_in_at || Date.now() - new Date(r.last_sign_in_at).getTime() >= 7 * 24 * 60 * 60 * 1000
  );

  const online = today.filter((r) => isOnline(r.last_sign_in_at));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Usuários Ativos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Baseado no último login registrado pelo Supabase Auth.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Atualizado {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Online agora
          </div>
          <p className="text-3xl font-extrabold">{online.length}</p>
          <p className="text-xs text-muted-foreground">Logaram nos últimos 30 min</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-blue-500 font-semibold text-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Últimas 24h
          </div>
          <p className="text-3xl font-extrabold">{today.length}</p>
          <p className="text-xs text-muted-foreground">Acessos hoje</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm">
            <Circle className="w-3.5 h-3.5" /> Esta semana
          </div>
          <p className="text-3xl font-extrabold">{week.length}</p>
          <p className="text-xs text-muted-foreground">Acessos nos últimos 7 dias</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground animate-pulse text-sm">
          Carregando...
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Horário exato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const online = isOnline(r.last_sign_in_at);
                return (
                  <TableRow key={r.user_id} className="hover:bg-muted/40">
                    <TableCell>
                      <span
                        title={online ? "Online agora" : "Offline"}
                        className={`inline-block w-2.5 h-2.5 rounded-full ${online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.display_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : r.status === "trialing" ? "secondary" : "outline"}>
                        {r.status === "active" ? "Ativo" : r.status === "trialing" ? "Trial" : r.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.last_sign_in_at ? (
                        <span className={online ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                          {timeAgo(r.last_sign_in_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.last_sign_in_at
                        ? new Date(r.last_sign_in_at).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
