import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    emoji: "👋",
    title: "Bem-vindo ao SystemHub!",
    desc: "Seu sistema veterinário com IA integrada. Vamos dar uma volta rápida para você aproveitar ao máximo.",
  },
  {
    emoji: "🔬",
    title: "Bulário gratuito para todos",
    desc: "Busque medicamentos por nome, princípio ativo ou espécie. Assine para desbloquear a calculadora de dose com IA.",
  },
  {
    emoji: "🏥",
    title: "Configure sua clínica",
    desc: "Vá em Configurações para adicionar o nome da clínica, logo e preferências de atendimento.",
  },
];

const STORAGE_KEY = "onboarding_done_v1";

export function OnboardingModal() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!open) return null;

  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border shadow-2xl max-w-sm w-full p-6 space-y-5">
        {/* Progress */}
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-2 py-1">
          <div className="text-4xl">{s.emoji}</div>
          <h3 className="font-extrabold text-lg leading-snug">{s.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button onClick={next} className="w-full font-bold">
            {step < STEPS.length - 1 ? "Próximo →" : "Começar agora"}
          </Button>
          <button
            onClick={dismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Pular tour
          </button>
        </div>
      </div>
    </div>
  );
}
