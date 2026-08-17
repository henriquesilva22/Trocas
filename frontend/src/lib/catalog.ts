export type ProductCategory =
  | 'CELULAR'
  | 'NOTEBOOK'
  | 'MOUSE'
  | 'TECLADO'
  | 'FONE'
  | 'PECA_PC'
  | 'MONITOR'
  | 'ACESSORIO'
  | 'OUTRO';

export type ProductCondition =
  | 'NOVO'
  | 'SEMINOVO'
  | 'USADO_BOM_ESTADO'
  | 'USADO_COM_MARCAS'
  | 'PARA_PECAS';

export type ProductStatus = 'DISPONIVEL' | 'EM_NEGOCIACAO' | 'RESERVADO' | 'VENDIDO' | 'TROCADO' | 'REMOVIDO';

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  CELULAR: 'Celular',
  NOTEBOOK: 'Notebook',
  MOUSE: 'Mouse',
  TECLADO: 'Teclado',
  FONE: 'Fone',
  PECA_PC: 'Peça de PC / GPU',
  MONITOR: 'Monitor',
  ACESSORIO: 'Acessório',
  OUTRO: 'Outro',
};

export const CATEGORY_ICON: Record<ProductCategory, string> = {
  CELULAR: '📱',
  NOTEBOOK: '💻',
  MOUSE: '🖱️',
  TECLADO: '⌨️',
  FONE: '🎧',
  PECA_PC: '🎮',
  MONITOR: '🖥️',
  ACESSORIO: '🔌',
  OUTRO: '📦',
};

export const CONDITION_LABEL: Record<ProductCondition, string> = {
  NOVO: 'Novo',
  SEMINOVO: 'Seminovo',
  USADO_BOM_ESTADO: 'Usado — bom estado',
  USADO_COM_MARCAS: 'Usado — com marcas',
  PARA_PECAS: 'Para peças',
};

export interface ProductSeller {
  id: string;
  name: string;
  trustScore: number;
}

export interface Product {
  id: string;
  sellerId: string;
  seller?: ProductSeller;
  title: string;
  description: string;
  category: ProductCategory;
  condition: ProductCondition;
  priceAsking: string;
  city: string;
  photoUrls: string[];
  acceptedCategories: ProductCategory[];
  status: ProductStatus;
  createdAt: string;
}

export function formatBRL(value: string | number): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export type ProposalStatus = 'PENDENTE' | 'ACEITA' | 'REJEITADA' | 'EXPIRADA' | 'CANCELADA';
export type ProposedBy = 'BUYER' | 'SELLER';

export interface Proposal {
  id: string;
  productId: string;
  product: Product;
  buyerId: string;
  buyer: { id: string; name: string; trustScore: number };
  offeredProductId: string | null;
  offeredProduct: Product | null;
  amount: string;
  message: string | null;
  proposedBy: ProposedBy;
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
}
