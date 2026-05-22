import type { VerticalConfig, VerticalId } from "./types";

/** Universal modules — exibidos em todas as verticais. */
export const UNIVERSAL_MODULES = [
  "agenda", "clientes", "lembretes", "documentos", "caixa", "servicos",
  "estoque", "fornecedores", "financeiro", "contas", "relatorios",
  "funcionarios", "configuracoes", "lixeira",
];

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  vet: {
    id: "vet",
    brand: "SystemHub Vet",
    shortLabel: "Vet",
    tagline: "Sistema completo para clínicas e profissionais veterinários",
    subjectLabel: "Pet",
    subjectPluralLabel: "Animais",
    clientLabel: "Tutor",
    clientPluralLabel: "Tutores",
    modules: ["animais", "internacao", "bulario"],
  },
  nutri: {
    id: "nutri",
    brand: "SystemHub Nutri",
    shortLabel: "Nutri",
    tagline: "Gestão completa para nutricionistas: pacientes, planos alimentares e evolução",
    subjectLabel: "Paciente",
    subjectPluralLabel: "Pacientes",
    clientLabel: "Paciente",
    clientPluralLabel: "Pacientes",
    modules: ["pacientes"],
  },
  estetica: {
    id: "estetica", brand: "SystemHub Estética", shortLabel: "Estética",
    tagline: "Em breve — gestão completa para clínicas de estética",
    subjectLabel: "Cliente", subjectPluralLabel: "Clientes",
    clientLabel: "Cliente", clientPluralLabel: "Clientes",
    comingSoon: true, modules: [],
  },
  psi: {
    id: "psi", brand: "SystemHub Psi", shortLabel: "Psi",
    tagline: "Em breve — gestão completa para psicólogos e terapeutas",
    subjectLabel: "Paciente", subjectPluralLabel: "Pacientes",
    clientLabel: "Paciente", clientPluralLabel: "Pacientes",
    comingSoon: true, modules: [],
  },
  barber: {
    id: "barber", brand: "SystemHub Barber", shortLabel: "Barber",
    tagline: "Em breve — gestão para barbearias e salões",
    subjectLabel: "Cliente", subjectPluralLabel: "Clientes",
    clientLabel: "Cliente", clientPluralLabel: "Clientes",
    comingSoon: true, modules: [],
  },
};

export const AVAILABLE_VERTICALS: VerticalId[] = ["vet", "nutri"];

export function getVertical(id: string | null | undefined): VerticalConfig {
  const v = (id ?? "vet") as VerticalId;
  return VERTICALS[v] ?? VERTICALS.vet;
}

export type { VerticalConfig, VerticalId };
