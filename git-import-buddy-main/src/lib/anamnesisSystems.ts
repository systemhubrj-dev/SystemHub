// Anamnesis by body systems - data definitions

export interface SystemSymptom {
  key: string;
  label: string;
  startDate?: string;
  checked: boolean;
}

export interface AnamnesisSystem {
  key: string;
  label: string;
  symptoms: SystemSymptom[];
}

export const ANAMNESIS_SYSTEMS: AnamnesisSystem[] = [
  {
    key: "digestivo",
    label: "Sistema Digestivo",
    symptoms: [
      { key: "anorexia", label: "Anorexia", checked: false },
      { key: "diarreia", label: "Diarréia", checked: false },
      { key: "hematoquesia", label: "Hematoquesia", checked: false },
      { key: "melena", label: "Melena", checked: false },
      { key: "vomito", label: "Vômito", checked: false },
      { key: "regurgitacao", label: "Regurgitação", checked: false },
      { key: "constipacao", label: "Constipação", checked: false },
      { key: "flatulencia", label: "Flatulência", checked: false },
      { key: "disfagia", label: "Disfagia", checked: false },
      { key: "sialorreia", label: "Sialorréia", checked: false },
      { key: "ictericia", label: "Icterícia", checked: false },
      { key: "polifagia", label: "Polifagia", checked: false },
    ],
  },
  {
    key: "cardio_respiratorio",
    label: "Sistema Cárdio-Respiratório",
    symptoms: [
      { key: "tosse", label: "Tosse", checked: false },
      { key: "espirro", label: "Espirro", checked: false },
      { key: "dispneia", label: "Dispneia", checked: false },
      { key: "taquipneia", label: "Taquipneia", checked: false },
      { key: "cianose", label: "Cianose", checked: false },
      { key: "secrecao_nasal", label: "Secreção nasal", checked: false },
      { key: "epistaxe", label: "Epistaxe", checked: false },
      { key: "intolerancia_exercicio", label: "Intolerância ao exercício", checked: false },
      { key: "sincope", label: "Síncope", checked: false },
    ],
  },
  {
    key: "genito_urinario",
    label: "Sistema Gênito-Urinário",
    symptoms: [
      { key: "poliuria", label: "Poliúria", checked: false },
      { key: "polidipsia", label: "Polidipsia", checked: false },
      { key: "disuria", label: "Disúria", checked: false },
      { key: "hematuria", label: "Hematúria", checked: false },
      { key: "incontinencia", label: "Incontinência", checked: false },
      { key: "secrecao_vaginal", label: "Secreção vaginal", checked: false },
      { key: "secrecao_prepucial", label: "Secreção prepucial", checked: false },
      { key: "anuria", label: "Anúria", checked: false },
    ],
  },
  {
    key: "nervoso",
    label: "Sistema Nervoso",
    symptoms: [
      { key: "convulsao", label: "Convulsão", checked: false },
      { key: "ataxia", label: "Ataxia", checked: false },
      { key: "paresia", label: "Paresia", checked: false },
      { key: "paralisia", label: "Paralisia", checked: false },
      { key: "tremores", label: "Tremores", checked: false },
      { key: "head_tilt", label: "Head tilt", checked: false },
      { key: "nistagmo", label: "Nistagmo", checked: false },
      { key: "desorientacao", label: "Desorientação", checked: false },
      { key: "agressividade", label: "Agressividade", checked: false },
    ],
  },
  {
    key: "locomotor",
    label: "Sistema Locomotor",
    symptoms: [
      { key: "claudicacao", label: "Claudicação", checked: false },
      { key: "dor_articular", label: "Dor articular", checked: false },
      { key: "edema_membro", label: "Edema de membro", checked: false },
      { key: "rigidez", label: "Rigidez", checked: false },
      { key: "fratura", label: "Fratura", checked: false },
      { key: "luxacao", label: "Luxação", checked: false },
      { key: "atrofia_muscular", label: "Atrofia muscular", checked: false },
    ],
  },
  {
    key: "tegumentar",
    label: "Sistema Tegumentar",
    symptoms: [
      { key: "prurido", label: "Prurido", checked: false },
      { key: "alopecia", label: "Alopecia", checked: false },
      { key: "dermatite", label: "Dermatite", checked: false },
      { key: "lesoes_pele", label: "Lesões de pele", checked: false },
      { key: "nodulos", label: "Nódulos", checked: false },
      { key: "seborreia", label: "Seborreia", checked: false },
      { key: "otite", label: "Otite", checked: false },
      { key: "secrecao_ocular", label: "Secreção ocular", checked: false },
      { key: "ferida", label: "Ferida", checked: false },
      { key: "ectoparasitas", label: "Ectoparasitas", checked: false },
    ],
  },
];
