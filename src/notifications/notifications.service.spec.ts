import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    type: 'like',
    title: 'New Like',
    message: 'Someone liked your post',
    isRead: false,
    relatedPostId: 'post-123',
    relatedUserId: 'user-456',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        userId: 'user-123',
        type: 'like',
        title: 'New Like',
        message: 'Someone liked your post',
        relatedPostId: 'post-123',
      });

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'like',
        }),
      });
    });
  });

  describe('findByUser', () => {
    it('should return all notifications for a user', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.findByUser('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter only unread notifications', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      await service.findByUser('user-123', true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead('notif-123', 'user-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markAsRead('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-123');

      expect(result.count).toBe(5);
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrismaService.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-123');

      expect(result).toEqual({ count: 3 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.delete('notif-123', 'user-123');

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.delete('nonexistent', 'user-123')).rejects.toThrow(NotFoundException);
    });
  });
});
