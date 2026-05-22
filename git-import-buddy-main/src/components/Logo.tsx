import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/logo-smart-hub-vet.png";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  showWordmark?: boolean;
  asLink?: boolean;
  to?: string;
  className?: string;
  /** Use lighter wordmark colors (for dark backgrounds) */
  inverted?: boolean;
}

const sizeMap: Record<LogoSize, { icon: string; text: string; gap: string }> = {
  sm: { icon: "h-6 w-6", text: "text-base", gap: "gap-1.5" },
  md: { icon: "h-8 w-8", text: "text-lg", gap: "gap-2" },
  lg: { icon: "h-10 w-10", text: "text-2xl", gap: "gap-2.5" },
  xl: { icon: "h-14 w-14", text: "text-3xl", gap: "gap-3" },
};

export function Logo({
  size = "md",
  showWordmark = true,
  asLink = false,
  to = "/",
  className,
  inverted = false,
}: LogoProps) {
  const s = sizeMap[size];

  const content = (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <img
        src={logoIcon}
        alt="SystemHub"
        className={cn(s.icon, "object-contain shrink-0 select-none")}
        draggable={false}
      />
      {showWordmark && (
        <span className={cn("font-extrabold tracking-tight leading-none", s.text)}>
          <span className={inverted ? "text-primary-foreground" : "text-primary"}>System</span>
          <span className="text-accent">Hub</span>
        </span>
      )}
    </span>
  );

  if (asLink) {
    return (
      <Link to={to} className="inline-flex items-center hover-scale">
        {content}
      </Link>
    );
  }
  return content;
}

export default Logo;
