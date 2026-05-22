import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { ClinicLogoUpload } from "@/components/settings/ClinicLogoUpload";

export default function Configuracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ display_name: "", phone: "", business_name: "", business_type: "", crmv: "", business_address: "", business_phone: "", business_cnpj: "", business_ie: "", logo_url: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setForm({
        display_name: data.display_name ?? "",
        phone: data.phone ?? "",
        business_name: data.business_name ?? "",
        business_type: data.business_type ?? "",
        crmv: (data as any).crmv ?? "",
        business_address: (data as any).business_address ?? "",
        business_phone: (data as any).business_phone ?? "",
        business_cnpj: (data as any).business_cnpj ?? "",
        business_ie: (data as any).business_ie ?? "",
        logo_url: (data as any).logo_url ?? "",
      });
    });
  }, [user]);

  const persistLogoUrl = async (url: string | null) => {
    if (!user) return;
    setForm((f) => ({ ...f, logo_url: url ?? "" }));
    await supabase.from("profiles").update({ logo_url: url } as any).eq("user_id", user.id);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      display_name: form.display_name || null,
      phone: form.phone || null,
      business_name: form.business_name || null,
      business_type: form.business_type || null,
      crmv: form.crmv || null,
      business_address: form.business_address || null,
      business_phone: form.business_phone || null,
      business_cnpj: form.business_cnpj || null,
      business_ie: form.business_ie || null,
    } as any).eq("user_id", user.id);
    if (error) toast.error("Erro: " + error.message);
    else toast.success("Configurações salvas!");
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Informações do seu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>CRMV</Label><Input value={form.crmv} onChange={(e) => setForm({ ...form, crmv: e.target.value })} placeholder="Ex: CRMV-SP 12345" /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled className="bg-muted" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados do negócio</CardTitle>
          <CardDescription>Informações da sua empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClinicLogoUpload
            logoUrl={form.logo_url || null}
            onChange={(url) => void persistLogoUrl(url)}
          />

          <div className="space-y-2"><Label>Nome da empresa</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Ex: Clínica Vet Pet" /></div>
          <div className="space-y-2"><Label>Tipo de negócio</Label><Input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} placeholder="Ex: Clínica Veterinária" /></div>
          <div className="space-y-2"><Label>Endereço da clínica</Label><Input value={form.business_address} onChange={(e) => setForm({ ...form, business_address: e.target.value })} placeholder="Ex: Rua das Flores, 123 — Centro, São Paulo/SP" /></div>
          <div className="space-y-2"><Label>Telefone da clínica</Label><Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} placeholder="Ex: (11) 99999-9999" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>CNPJ</Label><Input value={form.business_cnpj} onChange={(e) => setForm({ ...form, business_cnpj: e.target.value })} placeholder="Ex: 12.345.678/0001-90" /></div>
            <div className="space-y-2"><Label>Inscrição Estadual</Label><Input value={form.business_ie} onChange={(e) => setForm({ ...form, business_ie: e.target.value })} placeholder="Ex: 123.456.789.000" /></div>
          </div>
          <p className="text-xs text-muted-foreground">📋 A logo, endereço, telefone, CNPJ e IE aparecem no cabeçalho dos receituários, atestados e termos em PDF.</p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
