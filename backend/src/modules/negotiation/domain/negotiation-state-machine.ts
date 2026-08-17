import { NegotiationStatus } from '@prisma/client';

/**
 * Fonte única de verdade para transições válidas da Negotiation.
 * Qualquer serviço (Negotiation, Inspection, Payments/Webhooks) que precise
 * mudar o status de uma negociação DEVE passar por `assertTransition`.
 *
 * Isso impede, por exemplo, que um webhook de pagamento duplicado empurre
 * a negociação de PAGAMENTO_CONFIRMADO -> PAGAMENTO_CONFIRMADO de novo,
 * ou que um pagamento seja confirmado antes da inspeção aprovar o produto.
 */
const ALLOWED_TRANSITIONS: Record<NegotiationStatus, NegotiationStatus[]> = {
  AGUARDANDO_PAGAMENTO_TAXA: ['AGUARDANDO_DROPOFF', 'CANCELADO'],
  AGUARDANDO_DROPOFF: ['EM_CUSTODIA_FISICA', 'CANCELADO'],
  EM_CUSTODIA_FISICA: ['EM_INSPECAO', 'CANCELADO'],
  EM_INSPECAO: ['INSPECIONADO_E_APROVADO', 'INSPECIONADO_REPROVADO'],
  INSPECIONADO_REPROVADO: ['EM_ANALISE', 'CANCELADO'],
  // Troca sem diferença em dinheiro (amount === 0) pula PAGAMENTO_PENDENTE e
  // vai direto pra PIN_GERADO — ver PaymentService.initiatePayment.
  INSPECIONADO_E_APROVADO: ['PAGAMENTO_PENDENTE', 'PIN_GERADO'],
  PAGAMENTO_PENDENTE: ['COMPROVANTE_ENVIADO', 'CANCELADO'],
  COMPROVANTE_ENVIADO: ['PAGAMENTO_CONFIRMADO', 'EM_ANALISE'],
  PAGAMENTO_CONFIRMADO: ['PIN_GERADO'],
  PIN_GERADO: ['FINALIZADO'],
  FINALIZADO: [],
  CANCELADO: [],
  EM_ANALISE: ['CANCELADO', 'INSPECIONADO_E_APROVADO'],
};

export class InvalidNegotiationTransitionError extends Error {
  constructor(from: NegotiationStatus, to: NegotiationStatus) {
    super(`Transição inválida: ${from} -> ${to}`);
    this.name = 'InvalidNegotiationTransitionError';
  }
}

export function assertTransition(from: NegotiationStatus, to: NegotiationStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new InvalidNegotiationTransitionError(from, to);
  }
}

export function canTransition(from: NegotiationStatus, to: NegotiationStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}
