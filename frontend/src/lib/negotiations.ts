import { Product } from './catalog';

export type NegotiationStatus =
  | 'AGUARDANDO_PAGAMENTO_TAXA'
  | 'AGUARDANDO_DROPOFF'
  | 'EM_CUSTODIA_FISICA'
  | 'EM_INSPECAO'
  | 'INSPECIONADO_REPROVADO'
  | 'INSPECIONADO_E_APROVADO'
  | 'PAGAMENTO_PENDENTE'
  | 'COMPROVANTE_ENVIADO'
  | 'PAGAMENTO_CONFIRMADO'
  | 'PIN_GERADO'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'EM_ANALISE';

export type DeliveryMethod = 'ENVIO' | 'PRESENCIAL';
export type ReceiveMethod = 'RETIRADA_HUB' | 'ENVIO';

export const NEGOTIATION_STATUS_LABEL: Record<NegotiationStatus, string> = {
  AGUARDANDO_PAGAMENTO_TAXA: 'Aguardando pagamento da taxa de intermediação',
  AGUARDANDO_DROPOFF: 'Aguardando entrega dos produtos no Hub',
  EM_CUSTODIA_FISICA: 'Produtos recebidos no Hub',
  EM_INSPECAO: 'Em inspeção',
  INSPECIONADO_REPROVADO: 'Reprovado na inspeção',
  INSPECIONADO_E_APROVADO: 'Aprovado na inspeção',
  PAGAMENTO_PENDENTE: 'Aguardando pagamento da diferença',
  COMPROVANTE_ENVIADO: 'Comprovante enviado',
  PAGAMENTO_CONFIRMADO: 'Pagamento confirmado',
  PIN_GERADO: 'Pronto para retirada',
  FINALIZADO: 'Troca concluída',
  CANCELADO: 'Cancelada',
  EM_ANALISE: 'Em análise (disputa)',
};

export const STATUS_ORDER: NegotiationStatus[] = [
  'AGUARDANDO_PAGAMENTO_TAXA',
  'AGUARDANDO_DROPOFF',
  'EM_CUSTODIA_FISICA',
  'EM_INSPECAO',
  'INSPECIONADO_E_APROVADO',
  'PAGAMENTO_PENDENTE',
  'PAGAMENTO_CONFIRMADO',
  'PIN_GERADO',
  'FINALIZADO',
];

export interface Hub {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
}

export interface Negotiation {
  id: string;
  productId: string;
  product: Product;
  offeredProductId: string | null;
  offeredProduct: Product | null;
  buyerId: string;
  sellerId: string;
  hubId: string | null;
  amount: string;
  status: NegotiationStatus;
  buyerDeliveryMethod: DeliveryMethod | null;
  buyerScheduledAt: string | null;
  sellerDeliveryMethod: DeliveryMethod | null;
  sellerScheduledAt: string | null;
  pickupPin: string | null;
  buyerReceiveMethod: ReceiveMethod | null;
  buyerReceivedAt: string | null;
  sellerReceiveMethod: ReceiveMethod | null;
  sellerReceivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationDetail extends Negotiation {
  buyer: { id: string; name: string };
  seller: { id: string; name: string };
  hub: Hub | null;
}
