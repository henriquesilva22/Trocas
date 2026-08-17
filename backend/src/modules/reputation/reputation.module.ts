import { Module } from '@nestjs/common';
import { ReviewsController } from './interface/reviews.controller';
import { UserProfileController } from './interface/user-profile.controller';
import { ReviewsService } from './application/services/reviews.service';
import { UserProfileService } from './application/services/user-profile.service';

@Module({
  controllers: [ReviewsController, UserProfileController],
  providers: [ReviewsService, UserProfileService],
})
export class ReputationModule {}
