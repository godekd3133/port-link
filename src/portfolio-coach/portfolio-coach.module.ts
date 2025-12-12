import { Module } from '@nestjs/common';
import { PortfolioCoachController } from './portfolio-coach.controller';
import { PortfolioCoachService } from './portfolio-coach.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PortfolioCoachController],
  providers: [PortfolioCoachService],
  exports: [PortfolioCoachService],
})
export class PortfolioCoachModule {}
