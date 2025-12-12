import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedPostId?: string;
  relatedUserId?: string;
  createdAt: Date;
}

@Injectable()
export class WebSocketService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: NotificationPayload) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Send notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: NotificationPayload) {
    userIds.forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  /**
   * Broadcast to all connected users
   */
  broadcastNotification(notification: NotificationPayload) {
    if (!this.server) return;
    this.server.emit('notification', notification);
  }

  /**
   * Send unread count update to user
   */
  sendUnreadCount(userId: string, count: number) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('unread_count', { count });
  }

  /**
   * Notify about new comment on a post
   */
  notifyNewComment(
    postAuthorId: string,
    comment: {
      postId: string;
      postTitle: string;
      commenterName: string;
      content: string;
    },
  ) {
    this.sendNotificationToUser(postAuthorId, {
      id: `comment-${Date.now()}`,
      type: 'comment',
      title: 'New Comment',
      message: `${comment.commenterName} commented on "${comment.postTitle}"`,
      relatedPostId: comment.postId,
      createdAt: new Date(),
    });
  }

  /**
   * Notify about new like on a post
   */
  notifyNewLike(
    postAuthorId: string,
    like: {
      postId: string;
      postTitle: string;
      likerName: string;
    },
  ) {
    this.sendNotificationToUser(postAuthorId, {
      id: `like-${Date.now()}`,
      type: 'like',
      title: 'New Like',
      message: `${like.likerName} liked your post "${like.postTitle}"`,
      relatedPostId: like.postId,
      createdAt: new Date(),
    });
  }

  /**
   * Notify about new bookmark on a post
   */
  notifyNewBookmark(
    postAuthorId: string,
    bookmark: {
      postId: string;
      postTitle: string;
      userName: string;
    },
  ) {
    this.sendNotificationToUser(postAuthorId, {
      id: `bookmark-${Date.now()}`,
      type: 'bookmark',
      title: 'New Bookmark',
      message: `${bookmark.userName} bookmarked your post "${bookmark.postTitle}"`,
      relatedPostId: bookmark.postId,
      createdAt: new Date(),
    });
  }

  /**
   * Get connected users count
   */
  async getConnectedUsersCount(): Promise<number> {
    if (!this.server) return 0;
    const sockets = await this.server.fetchSockets();
    return sockets.length;
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    const sockets = await this.server.in(`user:${userId}`).fetchSockets();
    return sockets.length > 0;
  }
}
