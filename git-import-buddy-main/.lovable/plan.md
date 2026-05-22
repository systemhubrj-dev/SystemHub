# SystemHub Hub Multi-Vertical — Análise + Base + MVP Nutri

## 1. Diagnóstico atual

Hoje o SystemHub é um SaaS **vertical-fixo de Veterinária**, mas grande parte do código já é genérico e reaproveitável.

**Núcleo reutilizável (verde — serve para qualquer profissional autônomo/clínica):**
- Auth + multi-tenant por `user_id` + equipe (`user_roles`, `is_team_member`)
- Planos / billing (Mercado Pago, `usePlanLimits`, `PlanGate`, `RoleGate`)
- Agenda (`appointments`)
- Clientes (`clients`)
- Financeiro (`financial_records`, `bills`, `cash_sessions`, `cash_items`)
- Equipe + comissões (`employees`, `employee_commissions`, `auto_compute_commission`)
- Estoque + fornecedores (`inventory_items`, `inventory_movements`, `suppliers`)
- Serviços (`services`)
- Lembretes, Documentos genéricos, Lixeira, Relatórios, Configurações, IA Gateway (`vet-assistant`, `clinical-ai`, `cash-ai`), Suporte por e-mail

**Específico de Vet (amarelo — precisa virar módulo plugável):**
- `Animais` / `PetProfile` / `pets`, `pet_attachments`
- `Internação` (`hospitalizations`, `hospitalization_*`, `nursing_checks`)
- `Bulário` (`drug_catalog`, `drug_reference*`)
- `clinical_entries` / `clinical_records` (anamnese vet)
- Termos/atestados vet, `vetTermsPdf`, `vetDocumentPdf`, `prescriptionPdf`
- Edge functions `clinical-ai`, `enrich-drug`, `validate-drug`, `drug-autocomplete`
- Sidebar com labels "Animais", "Internação", "Bulário"
- Marketing (Hero, Pricing, Audience) totalmente focado em vet

**Conclusão:** ~70% do sistema já é horizontal. O que falta é **isolar a "vertical" como dimensão de configuração** e introduzir a primeira segunda trilha (Nutri) provando o modelo.

---

## 2. Visão de produto — SystemHub Hub

**Marca:** SystemHub (guarda-chuva) com sub-marcas:
- **SystemHub Vet** (atual)
- **SystemHub Nutri** (1ª nova vertical — MVP nesta entrega)
- Roadmap: SystemHub Estética, SystemHub Psi, SystemHub Barber

**Modelo de trilha:** vertical é **escolhida no cadastro e fica fixa por conta** (troca apenas via suporte). Mesmos planos (Essencial / Profissional / Clínica), mesmos preços (R$ 89,90 / 139,90 / 199,90) — o que muda é o conjunto de módulos visíveis.

**Site institucional:** landing page raiz vira um seletor "Para quem é o SystemHub?" com cards Vet / Nutri (e "em breve"). Cada vertical tem sua sub-landing (`/vet`, `/nutri`).

---

## 3. Arquitetura proposta

### 3.1 Conceito-chave: `vertical`
Nova coluna `vertical` em `profiles` (`vet | nutri | estetica | ...`), default `vet` para contas existentes. Toda a lógica de UI (sidebar, dashboard home, marketing dentro do app, IA system prompts) lê esse campo.

### 3.2 Registry de verticais (frontend)
Um único arquivo `src/verticals/index.ts` declara cada vertical:
```text
{
  id, label, brand, color,
  subjectLabel,            // "Pet" | "Paciente"
  subjectPluralLabel,      // "Animais" | "Pacientes"
  modules: [agenda, clientes, subjects, financeiro, ...],
  routes: [...],
  sidebarGroups: [...],
  aiSystemPrompt,
  documentTemplates,
}
```
A `AppSidebar`, o `App.tsx` (rotas) e os textos consomem o registry — **nada hardcoded por vertical fora dele**.

### 3.3 Generalização do "sujeito do atendimento"
- `pets` continua como tabela vet. Criamos `subjects` (genérico: `id, user_id, client_id, name, birth_date, vertical, extra jsonb`) **ou** mantemos `pets` para Vet e criamos `patients` para Nutri (decisão recomendada: nova tabela `patients` para evitar reescrever todas as FKs vet, e o registry mapeia "subject" → tabela certa).
- Componentes compartilhados (`SubjectCard`, `SubjectAttachments`) recebem props do registry.

### 3.4 Módulos plugáveis
Cada item de menu/rota declara `verticals: ["vet"]` ou `["vet","nutri"]`. `App.tsx` filtra rotas; `AppSidebar` filtra grupos. Internação, Bulário, Animais → `["vet"]`. Agenda, Clientes, Financeiro, Caixa, Estoque, Equipe, Configurações, Lembretes, Documentos, Relatórios → todas as verticais.

### 3.5 IA por vertical
`vet-assistant` vira `assistant` com `system_prompt` selecionado por `profile.vertical`. Novo edge `nutri-ai` (ou parâmetro na função existente) com prompts de avaliação nutricional e cálculo de plano alimentar.

---

## 4. MVP SystemHub Nutri

Para Nutri, com o que já temos + 4 telas novas:

**Reaproveitado direto:** Auth, Planos, Agenda, Clientes (passa a ser "Pacientes" via label), Financeiro, Caixa, Contas a Pagar, Equipe + Comissões, Lembretes, Configurações, Lixeira, Relatórios, Documentos, Suporte.

**Novo (telas/tabelas Nutri):**
1. **Pacientes** (`patients`): dados clínicos básicos, objetivo (emagrecimento, hipertrofia, saúde), restrições alimentares, alergias, condições.
2. **Avaliações antropométricas** (`patient_assessments`): peso, altura, IMC, circunferências (cintura, quadril, braço…), %BF estimado, bioimpedância (jsonb), data, fotos.
3. **Planos alimentares** (`meal_plans` + `meal_plan_items`): refeições (café, lanche, almoço…), alimentos, quantidades em g/ml, calorias, macros (P/C/G). Geração via IA a partir do objetivo e antropometria. PDF exportável com header da clínica.
4. **Anamnese nutricional** (`nutri_anamnesis`): hábitos alimentares, recordatório 24h, água, sono, atividade física, exames. Reaproveita o padrão `clinical_entries` (jsonb).

**IA (Lovable AI Gateway, sem chave):** "Sugerir plano alimentar" e "Resumir evolução do paciente". Reusa `useAiGate` e `usePlanLimits`.

**Marketing:** sub-landing `/nutri` com Hero/Pricing/Audience adaptados; raiz `/` vira "escolha sua área".

---

## 5. Entregas (ordem de execução)

**Fase 1 — Fundação multi-vertical (refactor não-breaking)**
1. Migração: adiciona `vertical` em `profiles` (default `'vet'`), preenche todas as contas existentes como `vet`.
2. Cria `src/verticals/index.ts` (registry) e `useVertical()` hook.
3. Refatora `AppSidebar` e `App.tsx` para consumir o registry (Vet permanece idêntico para usuários atuais).
4. Substitui labels acopladas ("Animais", "Pet") por labels do registry quando o módulo for compartilhado.
5. Tela de signup ganha passo "Qual sua área?" (cards Vet / Nutri). Contas existentes não são afetadas.
6. Configurações ganha campo somente-leitura "Vertical" + link "trocar fale com suporte".

**Fase 2 — Hub institucional**
7. `/` vira seletor de vertical com cards e CTA. Páginas `/vet` e `/nutri` herdam a landing atual com conteúdo trocado.
8. `Pricing` e `Audience` ficam parametrizados por vertical.

**Fase 3 — MVP Nutri**
9. Migração: tabelas `patients`, `patient_assessments`, `meal_plans`, `meal_plan_items`, `nutri_anamnesis` com RLS por `is_team_member(user_id)`.
10. Páginas `Pacientes`, `PacienteProfile`, `Avaliacoes`, `PlanosAlimentares`, `AnamneseNutri` (espelhando o padrão de Animais/PetProfile).
11. Edge function `nutri-ai` (geração de plano alimentar + resumo de evolução) usando Lovable AI Gateway.
12. PDF de plano alimentar usando `vetDocumentPdf` generalizado para `documentPdf` (header da clínica, paginação).
13. Documentos: 2 templates Nutri (orientação alimentar, termo de consentimento).

**Fase 4 — Polimento**
14. Dashboard Home varia tiles por vertical (Vet: internações ativas; Nutri: pacientes com avaliação atrasada).
15. Email de boas-vindas usa template por vertical.
16. Roadmap: gating das próximas verticais (Estética, Psi) já fica mapeado no registry como "coming soon".

---

## 6. Detalhes técnicos

### 6.1 Migração principal (resumo)
```text
ALTER TABLE profiles ADD COLUMN vertical text NOT NULL DEFAULT 'vet';
-- novas tabelas Nutri com RLS padrão is_team_member(user_id) + auth.uid()=user_id
CREATE TABLE patients (...);
CREATE TABLE patient_assessments (...);
CREATE TABLE meal_plans (...);
CREATE TABLE meal_plan_items (...);
CREATE TABLE nutri_anamnesis (...);
```
Sem ALTER em tabelas vet. Sem mudança em RLS existentes.

### 6.2 Registry (esqueleto)
```text
verticals/
  index.ts            // export const VERTICALS = { vet, nutri }
  vet.ts              // modules, routes, labels, aiPrompt
  nutri.ts
  types.ts
```

### 6.3 Sidebar
`menuGroups` passa a ser função `buildMenuGroups(vertical)` lendo do registry. Itens carregam `verticals?: VerticalId[]` para filtragem.

### 6.4 IA
`useAiGate` ganha `vertical` no contexto; edge `assistant` recebe `vertical` no body para escolher o system prompt correto. Limites de uso permanecem iguais.

### 6.5 Compatibilidade
Todas as contas atuais ficam como `vet` → zero impacto visual para clientes existentes. Tudo o que é vet-only fica gated por `vertical === 'vet'`.

---

## 7. Fora de escopo desta entrega
- White-label / domínio próprio por vertical (fica para plano Clínica futuro).
- Multi-trilha por conta (fica como evolução; arquitetura já permite trocar a coluna `vertical` por uma tabela N:N depois).
- Verticais Estética/Psi (apenas reservadas no registry como "em breve").
- App mobile.

---

## 8. Riscos & mitigação
- **Risco:** quebrar fluxo vet ao refatorar sidebar/rotas. → Mitigação: registry com Vet como default + smoke test manual de cada rota antes do MVP Nutri.
- **Risco:** IA Nutri gerar planos sem validação clínica. → Mitigação: disclaimer fixo no PDF + obrigatoriedade de revisão pelo profissional antes de exportar.
- **Risco:** confusão de marca na landing raiz. → Mitigação: seletor com 2 cards grandes + ainda manter rota direta `/vet` indexada para SEO atual.
