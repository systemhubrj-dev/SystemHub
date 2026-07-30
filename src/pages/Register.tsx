import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { validateCPF, formatCPF, formatPhone } from "@/lib/cpf";
import { translateAuthError } from "@/lib/authErrors";
import { Logo } from "@/components/Logo";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const vertical = "vet" as const;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      submitting.current = false;
      return;
    }
    if (!validateCPF(cpf)) {
      toast.error("CPF inválido. Verifique o número digitado.");
      submitting.current = false;
      return;
    }
    const cleanCPF = cpf.replace(/\D/g, "");

    setLoading(true);

    // Verifica duplicidade (email + CPF) via RPC segura
    const { data: dup, error: dupError } = await supabase.rpc("check_signup_duplicate", {
      p_email: email.trim().toLowerCase(),
      p_cpf: cleanCPF,
    });

    if (dupError) {
      toast.error("Não foi possível validar o cadastro. Tente novamente.");
      setLoading(false);
      submitting.current = false;
      return;
    }

    const dupResult = dup as { email_exists?: boolean; cpf_exists?: boolean } | null;
    if (dupResult?.email_exists || dupResult?.cpf_exists) {
      toast.error("Já existe uma conta com estes dados. Faça login ou recupere sua senha.");
      setLoading(false);
      submitting.current = false;
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name, phone: phone.replace(/\D/g, ""), cpf: cleanCPF, vertical },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(translateAuthError(error.message));
    } else {
      // Update profile with CPF, phone and vertical
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ cpf: cleanCPF, phone: phone.replace(/\D/g, ""), vertical } as any)
          .eq("user_id", data.user.id);
      }
      toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
      navigate("/login");
    }
    setLoading(false);
    submitting.current = false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex justify-center">
          <Logo size="lg" asLink to="/" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Criar sua conta</CardTitle>
            <CardDescription>Preencha os dados abaixo para começar</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} required maxLength={14} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} required maxLength={15} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? "Criando conta..." : "Criar conta"}
              </Button>
              <span className="text-sm text-muted-foreground">
                Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
              </span>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
