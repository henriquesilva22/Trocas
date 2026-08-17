import { ProductCategory } from './catalog';

export interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  trustScore: number;
  avgRating: number | null;
  reviewCount: number;
  finalizedTrades: number;
  inProgressTrades: number;
  cancelledTrades: number;
  disputesCount: number;
  completionRate: number | null;
  tradesByCategory: Partial<Record<ProductCategory, number>>;
}
