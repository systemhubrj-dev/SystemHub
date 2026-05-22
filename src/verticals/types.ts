export type VerticalId = "vet" | "nutri" | "estetica" | "psi" | "barber";

export interface VerticalConfig {
  id: VerticalId;
  brand: string;            // "SystemHub Vet"
  shortLabel: string;       // "Vet"
  tagline: string;
  subjectLabel: string;     // "Pet" / "Paciente"
  subjectPluralLabel: string;
  clientLabel: string;      // "Tutor" / "Paciente"
  clientPluralLabel: string;
  comingSoon?: boolean;
  /** Permissions / sidebar menu keys this vertical exposes (besides the universal ones) */
  modules: string[];
  aiSystemPrompt?: string;
}
