import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu, X, ArrowRight, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
              Bulário
            </Link>
            <Link to="/sobre" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
              Sobre
            </Link>
            <Link to="/planos" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
              Planos
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user ? (
              <Link to="/dashboard">
                <Button variant="default" size="sm" className="gap-1.5 font-semibold">
                  Ir para o sistema <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                    <User className="h-4 w-4" />
                    Entrar
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="gap-1.5 font-bold">
                    Criar conta grátis <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile */}
          <button
            className="md:hidden text-foreground p-1"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white px-4 pb-4 pt-3 space-y-1 shadow-md">
          <Link to="/" className="block text-sm py-2 text-muted-foreground" onClick={() => setOpen(false)}>Bulário</Link>
          <Link to="/sobre" className="block text-sm py-2 text-muted-foreground" onClick={() => setOpen(false)}>Sobre</Link>
          <Link to="/planos" className="block text-sm py-2 text-muted-foreground" onClick={() => setOpen(false)}>Planos</Link>
          <div className="pt-2 flex flex-col gap-2 border-t">
            {user ? (
              <Link to="/dashboard"><Button size="sm" className="w-full">Ir para o sistema</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="outline" size="sm" className="w-full">Entrar</Button></Link>
                <Link to="/register"><Button size="sm" className="w-full font-bold">Criar conta grátis</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
