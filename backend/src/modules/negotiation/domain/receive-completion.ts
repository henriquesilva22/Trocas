/**
 * Regra pura de "os dois lados já receberam o item que ganharam" — condição
 * pra `PIN_GERADO -> FINALIZADO`. Usada tanto pelo técnico confirmando
 * retirada no Hub (InspectionService) quanto pelo usuário autodeclarando
 * recebimento de um envio (NegotiationsService) — cada um faz a própria
 * escrita no banco, mas os dois consultam esta mesma regra.
 *
 * Troca 100% em dinheiro (sem `offeredProductId`) não tem o que o vendedor
 * receber de volta — o lado dele já está satisfeito por definição.
 */
export function isReceiveComplete(negotiation: {
  offeredProductId: string | null;
  buyerReceivedAt: Date | null;
  sellerReceivedAt: Date | null;
}): boolean {
  const buyerDone = negotiation.buyerReceivedAt !== null;
  const sellerDone = negotiation.offeredProductId === null || negotiation.sellerReceivedAt !== null;
  return buyerDone && sellerDone;
}
