/**
 * Estrutura persistida em `Inspection.checklist` (Json). Fica tipada aqui
 * no domínio para o técnico não conseguir aprovar um item que nunca foi
 * respondido.
 */
export type ChecklistItemKey =
  | 'liga_normalmente'
  | 'tela_sem_trincos'
  | 'bateria_acima_80'
  | 'sem_sinal_de_reparo_nao_autorizado'
  | 'acessorios_conforme_anuncio'
  | 'imei_serial_confere';

export interface ChecklistItemResult {
  passed: boolean;
  note?: string;
}

export type InspectionChecklist = Record<ChecklistItemKey, ChecklistItemResult>;

export const REQUIRED_CHECKLIST_KEYS: ChecklistItemKey[] = [
  'liga_normalmente',
  'tela_sem_trincos',
  'bateria_acima_80',
  'sem_sinal_de_reparo_nao_autorizado',
  'acessorios_conforme_anuncio',
  'imei_serial_confere',
];

export class IncompleteChecklistError extends Error {
  constructor(missing: ChecklistItemKey[]) {
    super(`Checklist incompleto — itens faltando: ${missing.join(', ')}`);
    this.name = 'IncompleteChecklistError';
  }
}

/** Garante que todo item obrigatório foi respondido antes de aprovar/reprovar. */
export function assertChecklistComplete(checklist: InspectionChecklist): void {
  const missing = REQUIRED_CHECKLIST_KEYS.filter((key) => checklist[key] === undefined);
  if (missing.length > 0) {
    throw new IncompleteChecklistError(missing);
  }
}

export function checklistAllPassed(checklist: InspectionChecklist): boolean {
  return REQUIRED_CHECKLIST_KEYS.every((key) => checklist[key]?.passed === true);
}
