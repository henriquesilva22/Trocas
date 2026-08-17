import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { CreateReviewDto } from '../dto/create-review.dto';

const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';

/**
 * Avaliação pós-troca (item 17) — só depois de FINALIZADO, um por
 * participante por negociação (`@@unique([negotiationId, reviewerId])` no
 * schema já garante isso, aqui só traduzimos o erro pra uma mensagem clara).
 * Toda review recalcula o `trustScore` do avaliado (item 18).
 */
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(negotiationId: string, reviewerId: string, dto: CreateReviewDto) {
    const negotiation = await this.prisma.negotiation.findUniqueOrThrow({
      where: { id: negotiationId },
    });
    if (negotiation.status !== 'FINALIZADO') {
      throw new ConflictException('Só é possível avaliar depois que a troca é concluída');
    }

    const isBuyer = negotiation.buyerId === reviewerId;
    const isSeller = negotiation.sellerId === reviewerId;
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Você não é parte desta negociação');
    }
    const revieweeId = isBuyer ? negotiation.sellerId : negotiation.buyerId;

    let review;
    try {
      review = await this.prisma.review.create({
        data: { negotiationId, reviewerId, revieweeId, rating: dto.rating, comment: dto.comment },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT_ERROR) {
        throw new ConflictException('Você já avaliou esta negociação');
      }
      throw err;
    }

    await this.recalculateTrustScore(revieweeId);
    return review;
  }

  private async recalculateTrustScore(userId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
    });
    const avgRating = agg._avg.rating ?? 0;
    // Rating 1–5 -> trustScore 20–100, mesma escala 0-100 já usada no schema.
    const trustScore = Math.round(avgRating * 20);

    await this.prisma.user.update({ where: { id: userId }, data: { trustScore } });
    this.logger.log(`trustScore de ${userId} recalculado: ${trustScore}`);
  }
}
