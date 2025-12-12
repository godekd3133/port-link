import { Module } from '@nestjs/common';
import { EndorsementsController } from './endorsements.controller';
import { EndorsementsService } from './endorsements.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [EndorsementsController],
  providers: [EndorsementsService],
  exports: [EndorsementsService],
})
export class EndorsementsModule {}
