import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, LogIn, Upload } from "lucide-react";
import { toast } from "sonner";

interface ClinicRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  plan_id: string | null;
  status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
}

export default function AdminClients() {
  const navigate = useNavigate();
  const { setActingAs } = usePlatformAdmin();
  const [rows, setRows] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-clients");
      if (error) throw error;
      // hide platform admin accounts from the client list
      const list = ((data as any)?.clients ?? []).filter(
        (c: ClinicRow) => !c.email?.toLowerCase().endsWith("systemhubrj@gmail.com")
      );
      setRows(list);
    } catch (e: any) {
      toast.error("Falha ao carregar clientes: " + (e?.message ?? "erro"));
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.email?.toLowerCase().includes(s) ||
      r.display_name?.toLowerCase().includes(s) ||
      r.user_id.includes(s)
    );
  });

  const handleImpersonate = (r: ClinicRow) => {
    setActingAs(r.user_id, r.display_name || r.email || r.user_id.slice(0, 8));
    toast.success("Modo suporte ativo. Você está atuando como " + (r.display_name || r.email));
    navigate("/dashboard");
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Clientes da Plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Lista de todas as clínicas cadastradas no System Hub. Use "Atuar como" para prestar suporte ou "Importar" para subir uma planilha.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{loading ? "Carregando..." : `${filtered.length} cliente(s)`}</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8 w-64" placeholder="Buscar email ou nome..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => navigate("/admin/import")}>
              <Upload className="w-4 h-4 mr-2" /> Importar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.display_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.plan_id ?? "essencial"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : r.status === "trialing" ? "secondary" : "destructive"}>
                        {r.status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleImpersonate(r)}>
                        <LogIn className="w-3 h-3 mr-1" /> Atuar como
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
