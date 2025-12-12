import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      void _;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const tokens = await this.issueTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { password: __, ...result } = user;
    void __;
    const tokens = await this.issueTokens(result);
    return {
      ...tokens,
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
      },
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!existing || !existing.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(existing.user);
    return {
      ...tokens,
      user: {
        id: existing.user.id,
        email: existing.user.email,
        role: existing.user.role,
      },
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });

    return { success: true };
  }

  private async issueTokens(user: { id: string; email: string; role: string }) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
      secret: this.configService.get('JWT_SECRET'),
    });
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async createRefreshToken(userId: string) {
    const token = randomBytes(48).toString('hex');
    const expiresAt = this.getRefreshExpiryDate();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });

    return token;
  }

  private getRefreshExpiryDate() {
    const raw = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d';
    const ttlMs = this.parseDurationMs(raw, 30 * 24 * 60 * 60 * 1000);
    return new Date(Date.now() + ttlMs);
  }

  private parseDurationMs(value: string, fallbackMs: number) {
    const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
    if (!match) {
      return fallbackMs;
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return (unitMs[unit] || fallbackMs) * amount;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
