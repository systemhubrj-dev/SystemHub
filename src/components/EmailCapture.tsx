import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import { toast } from "sonner";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("Informe um e-mail válido"); return; }
    setLoading(true);
    const { error } = await supabase
      .from("email_leads" as any)
      .insert({ email: email.trim().toLowerCase(), source: "bulario" });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("Este e-mail já está cadastrado!");
      } else {
        toast.error("Erro ao salvar. Tente novamente.");
      }
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <section className="py-10 border-t border-b bg-primary/5">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <p className="text-primary font-bold text-lg">✓ E-mail recebido!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Você receberá novidades e dicas veterinárias em breve.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 border-t border-b bg-primary/5">
      <div className="container mx-auto px-4 max-w-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold">Receba novidades e dicas veterinárias</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sem spam. Conteúdo relevante e promoções exclusivas.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" disabled={loading} className="shrink-0 font-bold">
            {loading ? "Enviando..." : "Quero receber"}
          </Button>
        </form>
      </div>
    </section>
  );
}
