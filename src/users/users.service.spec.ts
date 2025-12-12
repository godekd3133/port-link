import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'USER',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      id: 'profile-123',
      userId: 'user-123',
      name: 'Test User',
      bio: null,
      avatar: null,
      githubUrl: null,
      websiteUrl: null,
      linkedinUrl: null,
      techStack: [],
    },
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with profile', async () => {
      const createUserDto = {
        email: 'new@example.com',
        password: 'hashedpassword',
        name: 'New User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.profile.findMany.mockResolvedValue([]);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        profile: { ...mockUser.profile, username: 'newuser' },
      });

      const result = await service.create(createUserDto);

      expect(result.email).toBe(createUserDto.email);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          profile: {
            create: expect.objectContaining({
              name: createUserDto.name,
              username: expect.any(String),
            }),
          },
        }),
        include: { profile: true },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password',
          name: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { profile: true },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { profile: true },
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          profile: true,
        },
      });
    });
  });
});
