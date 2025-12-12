import { Module } from '@nestjs/common';
import { MentionsController } from './mentions.controller';
import { MentionsService } from './mentions.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, WebSocketModule],
  controllers: [MentionsController],
  providers: [MentionsService],
  exports: [MentionsService],
})
export class MentionsModule {}
