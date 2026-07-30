import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import Footer from "@/components/landing/Footer";
import { Shield, Eye, Database, Trash2, Download, Mail, Lock, AlertTriangle } from "lucide-react";

const Section = ({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary shrink-0" />
      {title}
    </h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2 pl-7">
      {children}
    </div>
  </section>
);

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Logo size="sm" asLink to="/" />
          <span className="text-sm text-muted-foreground">/ Política de Privacidade</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Política de Privacidade</h1>
              <p className="text-xs text-muted-foreground">
                Versão 1.0 — em vigor desde 01/07/2025 · Última revisão: 02/07/2026
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong> e o
            Regulamento Geral de Proteção de Dados (GDPR), descremos aqui como o SystemHub coleta, usa,
            armazena e protege seus dados pessoais.
          </p>
        </div>

        {/* Controlador */}
        <Section icon={Database} title="1. Controlador de Dados">
          <p>
            O controlador dos dados pessoais é:
          </p>
          <div className="rounded-lg border bg-card p-4 space-y-1 not-prose">
            <p><strong>Razão social:</strong> System Hub Sistemas de Gestão LTDA</p>
            <p><strong>Plataforma:</strong> SystemHub — www.systemhub.app.br</p>
            <p><strong>Contato DPO:</strong>{" "}
              <a href="mailto:systemhubrj@gmail.com" className="text-primary underline underline-offset-2">
                systemhubrj@gmail.com
              </a>
            </p>
          </div>
        </Section>

        {/* Dados coletados */}
        <Section icon={Eye} title="2. Dados que Coletamos">
          <p>Coletamos apenas os dados necessários para a prestação do serviço:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Cadastro:</strong> nome completo, e-mail, telefone e CPF</li>
            <li><strong>Dados clínicos:</strong> fichas de pacientes, prontuários e prescrições cadastradas por você</li>
            <li><strong>Dados financeiros:</strong> lançamentos de caixa e contas inseridos na plataforma</li>
            <li><strong>Dados de uso:</strong> páginas visitadas, tipo de dispositivo e origem do acesso (analytics)</li>
            <li><strong>Comunicação:</strong> e-mail fornecido para receber novidades (se consentido)</li>
          </ul>
          <p className="mt-2">
            <strong>Não coletamos</strong> dados de cartão de crédito diretamente. Pagamentos são processados
            pelo Mercado Pago, conforme a política de privacidade deles.
          </p>
        </Section>

        {/* Finalidades */}
        <Section icon={Database} title="3. Finalidades e Base Legal">
          <div className="space-y-2">
            {[
              { fin: "Prestação do serviço veterinário (sistema de gestão)", base: "Execução de contrato — Art. 7º, V, LGPD" },
              { fin: "Autenticação e controle de acesso", base: "Legítimo interesse / Execução de contrato" },
              { fin: "Envio de alertas e lembretes da plataforma", base: "Execução de contrato" },
              { fin: "Analytics de uso para melhorias", base: "Legítimo interesse — Art. 7º, IX, LGPD" },
              { fin: "Envio de newsletter e novidades (opt-in)", base: "Consentimento — Art. 7º, I, LGPD" },
              { fin: "Cumprimento de obrigações legais", base: "Obrigação legal — Art. 7º, II, LGPD" },
            ].map((r) => (
              <div key={r.fin} className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium text-foreground text-xs">{r.fin}</p>
                <p className="text-xs mt-0.5">Base: {r.base}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Cookies */}
        <Section icon={Lock} title="4. Cookies e Rastreamento">
          <p>Utilizamos os seguintes tipos de cookie:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <strong>Essenciais:</strong> necessários para login e funcionamento da plataforma (sessão JWT do Supabase).
              Não podem ser desativados.
            </li>
            <li>
              <strong>Analíticos:</strong> registramos a página acessada, origem do tráfego, tipo de dispositivo e
              país — sem identificação pessoal de visitantes anônimos.
            </li>
          </ul>
          <p>Você pode gerenciar o consentimento a qualquer momento no aviso de cookies exibido ao acessar o site.</p>
        </Section>

        {/* Compartilhamento */}
        <Section icon={AlertTriangle} title="5. Compartilhamento de Dados">
          <p>Seus dados são compartilhados apenas com:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Supabase Inc.</strong> — infraestrutura de banco de dados e autenticação (EUA; contrato de DPA vigente)</li>
            <li><strong>Vercel Inc.</strong> — hospedagem da aplicação (EUA; Privacy Shield compliant)</li>
            <li><strong>Mercado Pago S.A.</strong> — processamento de pagamentos (Brasil)</li>
            <li><strong>Google LLC</strong> — login via Google OAuth (opcional)</li>
          </ul>
          <p>
            <strong>Não vendemos, alugamos ou compartilhamos</strong> seus dados com terceiros para fins de marketing.
          </p>
        </Section>

        {/* Retenção */}
        <Section icon={Database} title="6. Retenção dos Dados">
          <ul className="list-disc pl-4 space-y-1">
            <li>Dados de conta: mantidos enquanto a conta estiver ativa + 30 dias após cancelamento</li>
            <li>Dados clínicos: mantidos conforme exigência do CFMV (mínimo 5 anos após o último atendimento)</li>
            <li>Dados financeiros: 5 anos (obrigação fiscal)</li>
            <li>Logs de analytics: 90 dias</li>
            <li>E-mails de newsletter (opt-in): até revogação do consentimento</li>
          </ul>
        </Section>

        {/* Segurança */}
        <Section icon={Lock} title="7. Segurança">
          <ul className="list-disc pl-4 space-y-1">
            <li>Tráfego criptografado via TLS/HTTPS em todas as comunicações</li>
            <li>Tokens JWT com expiração curta; refresh token com rotação automática</li>
            <li>Row-Level Security (RLS) no banco de dados — cada clínica acessa apenas seus próprios dados</li>
            <li>Senhas armazenadas com hash bcrypt pelo Supabase Auth</li>
            <li>Rate limiting em tentativas de login e recuperação de senha</li>
            <li>Nenhum dado sensível trafega em parâmetros de URL</li>
          </ul>
        </Section>

        {/* Direitos do titular */}
        <Section icon={Shield} title="8. Seus Direitos (Art. 18 LGPD)">
          <p>Você tem direito a:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: Eye, label: "Confirmação e acesso", desc: "Saber quais dados temos sobre você" },
              { icon: Database, label: "Correção", desc: "Corrigir dados incompletos ou desatualizados" },
              { icon: Trash2, label: "Eliminação", desc: "Solicitar a exclusão dos seus dados" },
              { icon: Download, label: "Portabilidade", desc: "Exportar seus dados em formato legível" },
              { icon: AlertTriangle, label: "Revogação", desc: "Retirar o consentimento a qualquer momento" },
              { icon: Mail, label: "Informação", desc: "Saber com quem compartilhamos seus dados" },
            ].map(({ icon: I, label, desc }) => (
              <div key={label} className="rounded-lg border bg-card p-3 flex items-start gap-2">
                <I className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2">
            Para exercer qualquer direito, envie um e-mail para{" "}
            <a href="mailto:systemhubrj@gmail.com" className="text-primary underline underline-offset-2">
              systemhubrj@gmail.com
            </a>{" "}
            com o assunto <strong>"LGPD – [Tipo de Solicitação]"</strong>. Responderemos em até 15 dias úteis.
          </p>
        </Section>

        {/* Menores */}
        <Section icon={AlertTriangle} title="9. Menores de Idade">
          <p>
            O SystemHub é destinado a profissionais e empresas. Não coletamos intencionalmente dados de menores de 18 anos.
            Se identificarmos que dados de um menor foram fornecidos, os excluiremos imediatamente.
          </p>
        </Section>

        {/* Atualizações */}
        <Section icon={Database} title="10. Alterações nesta Política">
          <p>
            Podemos atualizar esta política periodicamente. Em caso de alterações relevantes, notificaremos por e-mail
            e/ou por aviso na plataforma. O uso continuado após a notificação implica aceitação da nova versão.
          </p>
        </Section>

        {/* Links */}
        <div className="rounded-xl border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <p className="font-semibold text-sm">Dúvidas sobre sua privacidade?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Entre em contato com nosso responsável pelo tratamento de dados.</p>
          </div>
          <a
            href="mailto:systemhubrj@gmail.com?subject=LGPD%20%E2%80%93%20Solicitação"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shrink-0"
          >
            <Mail className="h-4 w-4" />
            Falar com DPO
          </a>
        </div>

        <p className="text-xs text-muted-foreground text-center pb-4">
          Voltar para a{" "}
          <Link to="/" className="text-primary underline underline-offset-2">página inicial</Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}
