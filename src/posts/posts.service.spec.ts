import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('PostsService', () => {
  let service: PostsService;

  const mockPost = {
    id: 'post-123',
    authorId: 'user-123',
    title: 'Test Post',
    summary: 'Test summary',
    content: 'Test content for the post',
    techStack: ['TypeScript', 'NestJS'],
    status: 'DRAFT',
    viewCount: 0,
    isEditorPick: false,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'user-123',
      email: 'test@example.com',
      profile: { name: 'Test User' },
    },
    _count: { likes: 0, comments: 0, bookmarks: 0 },
  };

  const mockPrismaService = {
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new post', async () => {
      const createPostDto = {
        title: 'New Post',
        content: 'New post content here',
        techStack: ['React', 'Node.js'],
      };
      const userId = 'user-123';

      mockPrismaService.post.create.mockResolvedValue({
        ...mockPost,
        ...createPostDto,
      });

      const result = await service.create(userId, createPostDto);

      expect(result.title).toBe(createPostDto.title);
      expect(mockPrismaService.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: userId,
          title: createPostDto.title,
        }),
        include: expect.any(Object),
      });
    });

    it('should set publishedAt when status is PUBLISHED', async () => {
      const createPostDto = {
        title: 'Published Post',
        content: 'Content of published post',
        status: 'PUBLISHED' as const,
      };
      const userId = 'user-123';

      mockPrismaService.post.create.mockResolvedValue({
        ...mockPost,
        ...createPostDto,
        publishedAt: new Date(),
      });

      await service.create(userId, createPostDto);

      expect(mockPrismaService.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          publishedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findAll', () => {
    it('should return all posts', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([mockPost]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.post.findMany).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([]);

      await service.findAll('PUBLISHED');

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single post with incremented view count', async () => {
      const postWithIncrementedView = { ...mockPost, viewCount: 1 };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          post: {
            findUnique: jest.fn().mockResolvedValue(mockPost),
            update: jest.fn().mockResolvedValue(postWithIncrementedView),
          },
        });
      });

      const result = await service.findOne('post-123');

      expect(result.viewCount).toBe(1);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          post: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
          },
        });
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a post', async () => {
      const updateDto = { title: 'Updated Title' };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        ...updateDto,
      });

      const result = await service.update('post-123', 'user-123', updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      await expect(service.update('post-123', 'other-user', { title: 'New' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if post not found', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', 'user-123', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.delete.mockResolvedValue(mockPost);

      await service.remove('post-123', 'user-123');

      expect(mockPrismaService.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-123' },
      });
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      await expect(service.remove('post-123', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByAuthor', () => {
    it('should return posts by author', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([mockPost]);

      const result = await service.findByAuthor('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: 'user-123' },
        }),
      );
    });
  });
});
