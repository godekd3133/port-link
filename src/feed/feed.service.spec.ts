import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';

describe('FeedService', () => {
  let service: FeedService;

  const mockPosts = [
    {
      id: 'post-1',
      title: 'First Post',
      summary: 'First summary',
      content: 'First content',
      techStack: ['TypeScript', 'NestJS'],
      status: 'PUBLISHED',
      viewCount: 100,
      isEditorPick: true,
      publishedAt: new Date('2024-01-15'),
      author: { id: 'user-1', profile: { name: 'John' } },
      _count: { likes: 10, comments: 5, bookmarks: 3 },
    },
    {
      id: 'post-2',
      title: 'Second Post',
      summary: 'Second summary',
      content: 'Second content',
      techStack: ['React', 'Next.js'],
      status: 'PUBLISHED',
      viewCount: 50,
      isEditorPick: false,
      publishedAt: new Date('2024-01-10'),
      author: { id: 'user-2', profile: { name: 'Jane' } },
      _count: { likes: 5, comments: 2, bookmarks: 1 },
    },
  ];

  const mockPrismaService = {
    post: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    it('should return cached feed if available', async () => {
      const cachedResult = {
        posts: mockPosts,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      };
      mockCacheService.get.mockResolvedValue(cachedResult);

      const result = await service.getFeed({ page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      expect(mockPrismaService.post.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database if cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(2);
      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getFeed({ page: 1, limit: 10 });

      expect(result.posts).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should sort by latest (publishedAt desc)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(2);
      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);

      await service.getFeed({ sortBy: 'latest' });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        }),
      );
    });

    it('should sort by popular (viewCount desc)', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(2);
      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);

      await service.getFeed({ sortBy: 'popular' });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: 'desc' },
        }),
      );
    });

    it('should filter by techStack', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(1);
      mockPrismaService.post.findMany.mockResolvedValue([mockPosts[0]]);

      await service.getFeed({ techStack: ['TypeScript'] });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            techStack: { hasSome: ['TypeScript'] },
          }),
        }),
      );
    });

    it('should search in title, summary, and content', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(1);
      mockPrismaService.post.findMany.mockResolvedValue([mockPosts[0]]);

      await service.getFeed({ search: 'First' });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'First', mode: 'insensitive' } },
              { summary: { contains: 'First', mode: 'insensitive' } },
              { content: { contains: 'First', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should not cache search results', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(1);
      mockPrismaService.post.findMany.mockResolvedValue([mockPosts[0]]);

      await service.getFeed({ search: 'query' });

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should calculate trending score correctly', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.count.mockResolvedValue(2);
      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getFeed({ sortBy: 'trending' });

      // Post with higher engagement should come first
      expect(result.posts[0].id).toBe('post-1');
    });
  });

  describe('getEditorPicks', () => {
    it('should return cached editor picks if available', async () => {
      mockCacheService.get.mockResolvedValue([mockPosts[0]]);

      const result = await service.getEditorPicks();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.post.findMany).not.toHaveBeenCalled();
    });

    it('should fetch editor picks from database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.findMany.mockResolvedValue([mockPosts[0]]);

      const result = await service.getEditorPicks();

      expect(result).toHaveLength(1);
      expect(result[0].isEditorPick).toBe(true);
      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PUBLISHED',
            isEditorPick: true,
          },
          take: 5,
        }),
      );
    });
  });

  describe('getTrendingTags', () => {
    it('should return cached trending tags if available', async () => {
      const cachedTags = [{ tag: 'TypeScript', count: 10 }];
      mockCacheService.get.mockResolvedValue(cachedTags);

      const result = await service.getTrendingTags();

      expect(result).toEqual(cachedTags);
    });

    it('should calculate trending tags from posts', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.post.findMany.mockResolvedValue([
        { techStack: ['TypeScript', 'NestJS'] },
        { techStack: ['TypeScript', 'React'] },
        { techStack: ['Python'] },
      ]);

      const result = await service.getTrendingTags();

      expect(result[0].tag).toBe('TypeScript');
      expect(result[0].count).toBe(2);
    });
  });

  describe('invalidateFeedCache', () => {
    it('should delete all feed cache entries', async () => {
      await service.invalidateFeedCache();

      expect(mockCacheService.delPattern).toHaveBeenCalledWith('feed:*');
    });
  });
});
