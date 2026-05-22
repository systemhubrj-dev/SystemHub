
-- Reference table for drug autocomplete
CREATE TABLE public.drug_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commercial_name text,
  active_ingredient text NOT NULL,
  drug_class text,
  species text,
  indications text,
  dosage text,
  contraindications text,
  adverse_effects text,
  interactions text,
  withdrawal_period text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drug_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read drug references"
  ON public.drug_reference FOR SELECT TO authenticated
  USING (true);

-- Create index for fast name/ingredient lookups
CREATE INDEX idx_drug_reference_name ON public.drug_reference USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_drug_reference_ingredient ON public.drug_reference USING gin(to_tsvector('portuguese', active_ingredient));

-- Seed with common veterinary drugs
INSERT INTO public.drug_reference (name, commercial_name, active_ingredient, drug_class, species, indications, dosage, contraindications, adverse_effects, interactions, withdrawal_period) VALUES
('Sarolaner', 'Simparic', 'Sarolaner', 'Isoxazolina (Ectoparasiticida)', 'Cães', 'Tratamento e prevenção de infestações por pulgas e carrapatos. Tratamento de sarna demodécica e sarcóptica.', 'Cães: 2 a 4 mg/kg, via oral, dose única mensal. Comprimidos conforme faixa de peso.', 'Filhotes com menos de 8 semanas ou peso inferior a 1,3 kg. Hipersensibilidade ao princípio ativo.', 'Vômitos, diarreia, letargia, inapetência. Raramente: convulsões, ataxia, tremores musculares.', 'Usar com cautela com outros medicamentos que reduzem o limiar convulsivo. Sem interações significativas conhecidas com antiparasitários comuns.', 'Não aplicável (uso em animais de companhia).'),

('Meloxicam', 'Maxicam, Meloxivet', 'Meloxicam', 'AINE (Anti-inflamatório não esteroidal)', 'Cães, Gatos', 'Anti-inflamatório, analgésico e antipirético. Dores musculoesqueléticas, pós-operatório, osteoartrite.', 'Cães: 0,1 mg/kg/dia VO ou 0,2 mg/kg dose inicial. Gatos: 0,1 mg/kg dose única SC, manutenção 0,05 mg/kg/dia VO (máx 3-5 dias).', 'Insuficiência renal ou hepática, úlceras gastrointestinais, gestação, desidratação. Não usar em gatos desidratados.', 'Vômitos, diarreia, úlceras gástricas, insuficiência renal, hepatotoxicidade.', 'Não associar com corticosteroides ou outros AINEs. Cautela com aminoglicosídeos e diuréticos.', 'Bovinos: 15 dias (carne), 5 dias (leite).'),

('Amoxicilina', 'Agemoxi, Amoxil Vet', 'Amoxicilina', 'Antibiótico (Penicilina semissintética)', 'Cães, Gatos, Bovinos, Suínos, Aves', 'Infecções bacterianas do trato respiratório, urinário, pele e tecidos moles. Otites, piodermites.', 'Cães e Gatos: 10-25 mg/kg, VO, a cada 8-12h, por 7-14 dias. Bovinos: 7-15 mg/kg, IM.', 'Hipersensibilidade a penicilinas. Cautela em animais com insuficiência renal.', 'Diarreia, vômitos, reações alérgicas (urticária, anafilaxia em casos graves).', 'Pode reduzir a eficácia de bacteriostáticos (tetraciclinas, cloranfenicol). Probenecida aumenta níveis séricos.', 'Bovinos: carne 15-25 dias, leite 3-4 dias (conforme formulação).'),

('Ivermectina', 'Ivomec, Mectimax', 'Ivermectina', 'Antiparasitário (Lactona macrocíclica)', 'Cães, Gatos, Bovinos, Equinos, Suínos, Ovinos', 'Endoparasitas e ectoparasitas. Sarna demodécica, sarcóptica, nematóides gastrointestinais, dirofilariose (prevenção).', 'Cães: 0,006-0,6 mg/kg conforme indicação. Prevenção dirofilária: 0,006 mg/kg/mês VO. Sarna demodécica: 0,3-0,6 mg/kg/dia VO. Bovinos: 0,2 mg/kg SC.', 'Raças sensíveis à mutação MDR1 (Collie, Pastor de Shetland, Australian Shepherd). Filhotes < 6 semanas.', 'Ataxia, midríase, tremores, salivação, coma (especialmente em raças sensíveis). Dor no local da injeção.', 'Potencializa efeitos de benzodiazepínicos e barbitúricos. Cetoconazol e ciclosporina podem aumentar toxicidade.', 'Bovinos: carne 35 dias, leite 7-28 dias conforme formulação.'),

('Dipirona', 'Dipirona Vet, D-500', 'Dipirona sódica (Metamizol)', 'Analgésico e antipirético', 'Cães, Gatos, Equinos, Bovinos', 'Analgésico para dores leves a moderadas. Antipirético. Cólicas (equinos).', 'Cães: 25-35 mg/kg, VO/IV/SC, a cada 8-12h. Gatos: 12,5-25 mg/kg, VO/SC, a cada 12-24h. Equinos: 20-50 mg/kg IV lento.', 'Hipersensibilidade. Discrasias sanguíneas. Não usar IV rápido (risco de colapso). Gestação.', 'Discrasias sanguíneas (uso prolongado), reações alérgicas, hipotensão (IV rápido), salivação em gatos.', 'Potencializa efeitos de anticoagulantes. Evitar associação com clorpromazina (hipotermia).', 'Bovinos: carne 14 dias, leite 4 ordenhas.'),

('Cefalexina', 'Rilexine, Celesporin', 'Cefalexina', 'Antibiótico (Cefalosporina de 1ª geração)', 'Cães, Gatos', 'Piodermites, infecções de pele e tecidos moles, infecções urinárias, otites.', 'Cães e Gatos: 15-30 mg/kg, VO, a cada 12h, por 7-21 dias (piodermites profundas até 6-8 semanas).', 'Hipersensibilidade a cefalosporinas ou penicilinas (reação cruzada). Insuficiência renal grave.', 'Vômitos, diarreia, inapetência. Raramente reações alérgicas.', 'Aminoglicosídeos podem potencializar nefrotoxicidade. Probenecida aumenta concentrações séricas.', 'Não aplicável (uso em animais de companhia).'),

('Doxiciclina', 'Doxitrat, Ronaxan', 'Doxiciclina', 'Antibiótico (Tetraciclina)', 'Cães, Gatos', 'Erliquiose, anaplasmose, micoplasmose, leptospirose, infecções respiratórias, clamidiose (gatos).', 'Cães: 5-10 mg/kg, VO, a cada 12-24h, por 14-28 dias. Gatos: 5-10 mg/kg, VO, a cada 12-24h.', 'Gestação (risco teratogênico), animais em crescimento (alteração dentária). Insuficiência hepática.', 'Vômitos, esofagite (gatos – administrar com água), fotossensibilidade, hepatotoxicidade.', 'Antiácidos e suplementos de cálcio/ferro reduzem absorção. Pode potencializar anticoagulantes.', 'Não aplicável (uso em animais de companhia).'),

('Metronidazol', 'Flagyl Vet, Metronizol', 'Metronidazol', 'Antibiótico e antiprotozoário (Nitroimidazol)', 'Cães, Gatos', 'Giardíase, infecções anaeróbias, doença inflamatória intestinal, colite, infecções periodontais.', 'Cães: 15-25 mg/kg, VO, a cada 12h, por 5-7 dias. Gatos: 10-15 mg/kg, VO, a cada 12-24h.', 'Gestação, lactação, insuficiência hepática grave, animais com histórico de convulsões.', 'Neurotoxicidade em doses altas ou uso prolongado (ataxia, nistagmo, convulsões), vômitos, hepatotoxicidade.', 'Potencializa efeitos de anticoagulantes. Cimetidina aumenta níveis séricos. Evitar álcool (efeito dissulfiram).', 'Não aplicável (uso em animais de companhia).'),

('Prednisolona', 'Predsim Vet, Meticorten', 'Prednisolona', 'Corticosteroide (Glicocorticoide)', 'Cães, Gatos', 'Anti-inflamatório, imunossupressor. Alergias, doenças autoimunes, asma felina, choque, edema cerebral.', 'Anti-inflamatório: 0,5-1 mg/kg/dia VO. Imunossupressão: 2-4 mg/kg/dia VO. Reduzir dose gradualmente.', 'Infecções fúngicas sistêmicas, diabetes descompensado, úlceras GI. Evitar uso prolongado.', 'Poliúria, polidipsia, polifagia, imunossupressão, Cushing iatrogênico, atrofia muscular, retardo cicatricial.', 'Não associar com AINEs (risco de úlcera GI). Reduz eficácia de insulina e vacinas. Diuréticos aumentam hipocalemia.', 'Não aplicável (uso em animais de companhia).'),

('Fipronil', 'Frontline, Fiprolex', 'Fipronil', 'Ectoparasiticida (Fenilpirazol)', 'Cães, Gatos', 'Controle de pulgas, carrapatos e piolhos. Aplicação tópica (spot-on).', 'Cães e Gatos: aplicação tópica na região cervical dorsal. 1 pipeta conforme peso, a cada 30 dias.', 'Filhotes com menos de 8 semanas de idade. Animais debilitados ou doentes. NÃO usar em coelhos.', 'Irritação local transitória, prurido, alopecia no local da aplicação. Raramente: salivação se ingerido.', 'Pode ser associado com metopreno (S-metopreno) para controle de estágios imaturos. Sem interações significativas.', 'Não aplicável (uso em animais de companhia).'),

('Enrofloxacina', 'Baytril, Flotril', 'Enrofloxacina', 'Antibiótico (Fluoroquinolona)', 'Cães, Gatos (com restrição), Bovinos, Suínos, Aves', 'Infecções bacterianas graves: urinárias, respiratórias, pele, otites, prostatite.', 'Cães: 5-20 mg/kg, VO/IM/SC, a cada 24h, por 7-14 dias. Gatos: 5 mg/kg/dia (NÃO exceder, risco retiniano). Bovinos: 2,5-5 mg/kg IM.', 'Animais em crescimento (lesão em cartilagens), gestação. Gatos: doses > 5 mg/kg causam degeneração retiniana irreversível.', 'Artropatia em jovens, vômitos, cristalúria. Gatos: cegueira por degeneração retiniana em doses elevadas.', 'Antiácidos reduzem absorção. Teofilina: aumento de toxicidade. Evitar com AINEs (risco convulsivo).', 'Bovinos: carne 14 dias, leite 3-5 dias.'),

('Omeprazol', 'Gaviz Vet, Petprazol', 'Omeprazol', 'Inibidor da bomba de prótons', 'Cães, Gatos', 'Gastroprotetor. Úlceras gástricas, esofagite de refluxo, gastrite erosiva, prevenção de úlceras por AINEs/corticoides.', 'Cães: 0,5-1 mg/kg, VO, a cada 12-24h, em jejum (30 min antes da alimentação). Gatos: 0,5-1 mg/kg, VO, a cada 24h.', 'Hipersensibilidade. Uso prolongado pode mascarar neoplasias gástricas. Cautela em insuficiência hepática.', 'Geralmente bem tolerado. Raramente: diarreia, flatulência, náusea.', 'Pode alterar absorção de drogas pH-dependentes (cetoconazol, itraconazol, atazanavir). Inibe CYP2C19.', 'Não aplicável (uso em animais de companhia).');
