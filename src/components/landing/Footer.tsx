import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const Footer = () => (
  <footer className="py-10 border-t border-border">
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <Logo size="sm" />
      <a
        href="mailto:systemhubrj@gmail.com?subject=Contato%20SystemHub"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <Mail className="h-4 w-4 text-primary" />
        Suporte: <span className="font-semibold text-foreground">systemhubrj@gmail.com</span>
      </a>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} System Hub Sistemas de Gestão. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/privacidade" className="text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
            Política de Privacidade
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <a href="mailto:systemhubrj@gmail.com?subject=LGPD%20–%20Solicitação" className="text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
            LGPD — Meus dados
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
