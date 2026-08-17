export type ChecklistItemKey =
  | 'liga_normalmente'
  | 'tela_sem_trincos'
  | 'bateria_acima_80'
  | 'sem_sinal_de_reparo_nao_autorizado'
  | 'acessorios_conforme_anuncio'
  | 'imei_serial_confere';

export const CHECKLIST_ITEMS: { key: ChecklistItemKey; label: string }[] = [
  { key: 'liga_normalmente', label: 'Liga normalmente?' },
  { key: 'tela_sem_trincos', label: 'Tela sem trincos?' },
  { key: 'bateria_acima_80', label: 'Bateria acima de 80%?' },
  { key: 'sem_sinal_de_reparo_nao_autorizado', label: 'Sem sinal de reparo não autorizado?' },
  { key: 'acessorios_conforme_anuncio', label: 'Acessórios conforme anúncio?' },
  { key: 'imei_serial_confere', label: 'Número de série / IMEI confere?' },
];

export interface ChecklistItemResult {
  passed: boolean;
  note?: string;
}

export type Checklist = Record<ChecklistItemKey, ChecklistItemResult>;

export interface QueueItem {
  id: string;
  status: 'EM_CUSTODIA_FISICA' | 'EM_INSPECAO';
  amount: string;
  droppedOffAt: string | null;
  product: { id: string; title: string; category: string; photoUrls: string[] };
  offeredProduct: { id: string; title: string; category: string; photoUrls: string[] } | null;
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  hub: { id: string; name: string } | null;
}
