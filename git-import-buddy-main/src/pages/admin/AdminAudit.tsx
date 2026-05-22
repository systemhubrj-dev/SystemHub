import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminAudit() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("platform_admin_audit" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Auditoria do suporte</h1>
        <p className="text-sm text-muted-foreground">Últimas 200 ações de administradores da plataforma.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{loading ? "Carregando..." : `${rows.length} evento(s)`}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Cliente alvo</TableHead>
                <TableHead className="text-right">Registros</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge>{r.action}</Badge></TableCell>
                  <TableCell className="text-xs">{r.table_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.acting_as?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.record_count ?? 1}</TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem eventos.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
