// libs/modules/src/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/infra/prisma';
import { RedisService } from '@app/infra/redis';
import { WechatService } from './wechat.service';
import * as bcrypt from 'bcryptjs';

export interface JwtPayload {
  sub: number;
  tenantId?: number;
  roleCodes: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
    private wechatService: WechatService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: username },
          { email: username },
        ],
        status: 'active',
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return user;
  }

  async validateWxLogin(code: string, tenantId: number): Promise<any> {
    const wxResult = await this.wechatService.code2Session(code);
    const openid = wxResult.openid;

    let oauthBinding = await this.prisma.userOauthBinding.findUnique({
      where: {
        provider_openId: {
          provider: 'wechat',
          openId: openid,
        },
      },
    });

    if (!oauthBinding) {
      const user = await this.prisma.user.create({
        data: {
          nickname: `用户${Date.now()}`,
          unionId: wxResult.unionid,
        },
      });

      await this.prisma.userOauthBinding.create({
        data: {
          userId: user.id,
          provider: 'wechat',
          openId: openid,
        },
      });

      if (tenantId) {
        const defaultRole = await this.prisma.role.findFirst({
          where: { tenantId, code: 'member', isSystem: true },
        });

        if (defaultRole) {
          await this.prisma.tenantStaff.create({
            data: {
              tenantId,
              userId: user.id,
              roleId: defaultRole.id,
            },
          });
        }
      }

      return user;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: oauthBinding.userId },
    });

    return user;
  }

  async generateTokenPair(userId: number, tenantId?: number): Promise<TokenPair> {
    const staff = tenantId
      ? await this.prisma.tenantStaff.findFirst({
          where: { userId, tenantId, status: 'active' },
          include: { role: true },
        })
      : null;

    const roleCodes: string[] = [];
    if (staff) {
      roleCodes.push(staff.role.code);
    }

    const payload: JwtPayload = {
      sub: userId,
      tenantId,
      roleCodes,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '2h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    await this.redis.set(
      `refresh_token:${userId}:${tenantId || 0}`,
      refreshToken,
      7 * 24 * 60 * 60,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 7200,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
      const storedToken = await this.redis.get(
        `refresh_token:${payload.sub}:${payload.tenantId || 0}`,
      );

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      return this.generateTokenPair(payload.sub, payload.tenantId);
    } catch {
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  async logout(userId: number, tenantId?: number): Promise<void> {
    await this.redis.del(`refresh_token:${userId}:${tenantId || 0}`);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async getUserTenants(userId: number) {
    const staffs = await this.prisma.tenantStaff.findMany({
      where: { userId, status: 'active' },
    });

    const tenants = [];
    for (const staff of staffs) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: staff.tenantId },
      });
      if (tenant) {
        tenants.push(tenant);
      }
    }

    return tenants;
  }
}
