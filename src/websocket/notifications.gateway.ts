import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketService } from './websocket.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  namespace: '/notifications',
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly webSocketService: WebSocketService,
  ) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userEmail = payload.email;

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      // Track connected users
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)!.add(client.id);

      this.logger.log(`User ${payload.email} connected (socket: ${client.id})`);

      // Send connection confirmation
      client.emit('connected', {
        userId: payload.sub,
        socketId: client.id,
        message: 'Successfully connected to notifications',
      });
    } catch (error) {
      this.logger.error(`Authentication failed for socket ${client.id}`, error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(`User ${client.userEmail} disconnected (socket: ${client.id})`);
    }
  }

  @SubscribeMessage('subscribe_notifications')
  handleSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.logger.log(`User ${client.userEmail} subscribed to notifications`);
    return { success: true, message: 'Subscribed to notifications' };
  }

  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.logger.log(`User ${client.userEmail} marked notification ${data.notificationId} as read`);

    // Emit to all user's sockets to sync state
    this.server.to(`user:${client.userId}`).emit('notification_read', {
      notificationId: data.notificationId,
    });

    return { success: true };
  }

  @SubscribeMessage('mark_all_read')
  handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.logger.log(`User ${client.userEmail} marked all notifications as read`);

    // Emit to all user's sockets to sync state
    this.server.to(`user:${client.userId}`).emit('all_notifications_read');

    return { success: true };
  }

  @SubscribeMessage('ping')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlePing(@ConnectedSocket() _client: AuthenticatedSocket) {
    return { pong: true, timestamp: new Date().toISOString() };
  }

  /**
   * Get online status of users
   */
  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(
    @ConnectedSocket() _client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const onlineStatus: Record<string, boolean> = {};

    data.userIds.forEach((userId) => {
      onlineStatus[userId] = this.connectedUsers.has(userId);
    });

    return { onlineStatus };
  }

  /**
   * Get connection stats (admin only in production)
   */
  @SubscribeMessage('get_stats')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleGetStats(@ConnectedSocket() _client: AuthenticatedSocket) {
    return {
      totalConnections: this.server.sockets.sockets.size,
      uniqueUsers: this.connectedUsers.size,
      timestamp: new Date().toISOString(),
    };
  }
}
