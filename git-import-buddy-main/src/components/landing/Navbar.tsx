import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "glass shadow-md shadow-primary/5"
          : "bg-background/40 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="hover-scale inline-block">
          <Logo size="md" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#funcionalidades" className="story-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#publico" className="story-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Para quem</a>
          <a href="#precos" className="story-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Preços</a>
          <Link to="/login"><Button variant="ghost" size="sm" className="hover-scale">Entrar</Button></Link>
          <Link to="/register"><Button size="sm" className="hover-scale btn-shimmer">Começar agora</Button></Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass border-b border-border px-4 pb-4 space-y-3 animate-fade-in">
          <a href="#funcionalidades" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Funcionalidades</a>
          <a href="#publico" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Para quem</a>
          <a href="#precos" className="block text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Preços</a>
          <Link to="/login"><Button variant="ghost" size="sm" className="w-full">Entrar</Button></Link>
          <Link to="/register"><Button size="sm" className="w-full btn-shimmer">Começar agora</Button></Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
