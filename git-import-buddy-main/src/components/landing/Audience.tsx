import { Stethoscope, Heart, Home, ShoppingBag } from "lucide-react";

const audiences = [
  { icon: Stethoscope, title: "Clínicas Veterinárias", desc: "Controle de pacientes, vacinas e retornos" },
  { icon: Heart, title: "Clínicas Odontológicas", desc: "Agenda de consultas e procedimentos" },
  { icon: Home, title: "Atendimento Domiciliar", desc: "Organize visitas e acompanhamentos" },
  { icon: ShoppingBag, title: "Comércios Locais", desc: "Cadastro de clientes e controle financeiro" },
];

const Audience = () => {
  return (
    <section id="publico" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Feito para <span className="text-primary">quem atende de verdade</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Sistema adaptado à realidade de pequenas empresas e profissionais autônomos.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="text-center p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <a.icon size={26} className="text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Audience;
