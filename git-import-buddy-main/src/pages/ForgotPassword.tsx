import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { translateAuthError } from "@/lib/authErrors";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(translateAuthError(error.message));
    } else {
      setSent(true);
      toast.success("Email de recuperação enviado!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex justify-center">
          <Logo size="lg" asLink to="/" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Recuperar senha</CardTitle>
            <CardDescription>
              {sent ? "Verifique seu email" : "Informe seu email para receber o link de recuperação"}
            </CardDescription>
          </CardHeader>
          {!sent ? (
            <form onSubmit={handleReset}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
                <Link to="/login" className="text-sm text-primary hover:underline">Voltar ao login</Link>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">Enviamos um link de recuperação para <strong>{email}</strong>.</p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Voltar ao login</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
