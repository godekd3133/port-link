import { Module } from '@nestjs/common';
import { CollaborationsController } from './collaborations.controller';
import { CollaborationsService } from './collaborations.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [CollaborationsController],
  providers: [CollaborationsService, PrismaService],
  exports: [CollaborationsService],
})
export class CollaborationsModule {}
