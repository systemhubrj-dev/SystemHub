import { supabase } from "@/integrations/supabase/client";

/**
 * Soft-delete: salva o registro em `deleted_records` (retenção 60 dias)
 * e em seguida apaga da tabela original. Usa uma única transação lógica:
 * se o backup falhar, o delete não acontece.
 */
export async function softDeleteRecord(params: {
  table: string;
  recordId: string;
  recordData: Record<string, unknown>;
  userId: string;
  reason?: string;
}): Promise<{ error: Error | null }> {
  const { table, recordId, recordData, userId, reason } = params;

  // 1. Buscar dados do perfil/auth para auditoria
  const [{ data: profile }, { data: userRes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, business_name")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  // 2. Backup em deleted_records
  const { error: backupError } = await supabase.from("deleted_records").insert({
    user_id: userId,
    table_name: table,
    record_id: recordId,
    record_data: recordData as never,
    business_name: profile?.business_name ?? null,
    deleted_by_name: profile?.display_name ?? null,
    deleted_by_email: userRes?.user?.email ?? null,
    reason: reason ?? null,
  });

  if (backupError) {
    return { error: new Error(`Falha no backup: ${backupError.message}`) };
  }

  // 3. Apagar da tabela original
  const { error: deleteError } = await supabase
    .from(table as never)
    .delete()
    .eq("id", recordId);

  if (deleteError) {
    return { error: new Error(deleteError.message) };
  }

  return { error: null };
}
