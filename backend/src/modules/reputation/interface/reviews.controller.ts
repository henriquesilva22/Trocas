import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ReviewsService } from '../application/services/reviews.service';
import { CreateReviewDto } from '../application/dto/create-review.dto';
import { CurrentUser, AuthenticatedUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../users/interface/jwt-auth.guard';

@Controller('negotiations/:negotiationId/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  create(
    @Param('negotiationId') negotiationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(negotiationId, user.id, dto);
  }
}
