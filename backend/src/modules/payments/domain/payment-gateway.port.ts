export interface GatewayPaymentDetails {
  gatewayPaymentId: string;
  status: 'approved' | 'pending' | 'rejected' | 'refunded';
  amount: number;
  /** Metadata que devolvemos ao criar a cobrança — carrega o negotiationId. */
  externalReference: string;
}

/**
 * Porta que qualquer gateway de pagamento (Mercado Pago, Asaas) precisa
 * implementar. O domínio de Payments nunca fala diretamente com o SDK
 * de um gateway específico — sempre por trás desta interface.
 */
export interface PaymentGatewayPort {
  readonly gatewayName: 'MERCADO_PAGO' | 'ASAAS';

  /**
   * Valida a assinatura HMAC do webhook recebido. Deve ser chamado ANTES
   * de qualquer processamento — nunca confiar no payload sem validar.
   */
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): boolean;

  /**
   * Busca os detalhes reais do pagamento na API do gateway a partir do id
   * recebido no webhook. Nunca confiamos apenas no conteúdo do webhook —
   * ele só nos diz "algo mudou", buscamos a verdade na API do gateway.
   */
  fetchPaymentDetails(gatewayPaymentId: string): Promise<GatewayPaymentDetails>;

  /**
   * Cria a cobrança com Split: o valor do produto vai direto para a conta
   * do vendedor, e a taxa da plataforma é descontada na origem.
   */
  createSplitCharge(params: {
    negotiationId: string;
    amount: number;
    platformFee: number;
    sellerReceiverId: string;
  }): Promise<{ gatewayPaymentId: string; pixQrCode: string; pixCopyPaste: string }>;
}

export const PAYMENT_GATEWAY_PORT = Symbol('PAYMENT_GATEWAY_PORT');
