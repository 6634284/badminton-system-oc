// apps/admin-api/src/controllers/auth.controller.ts

import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '@app/modules/auth';

@ApiTags('auth')
@Controller('api/admin/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '后台登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  async login(@Body() body: { username: string; password: string }) {
    const user = await this.authService.validateUser(body.username, body.password);

    // 获取用户所属租户
    const tenants = await this.authService.getUserTenants(Number(user.id));
    const tenantId = tenants.length > 0 ? Number(tenants[0].id) : undefined;

    const tokens = await this.authService.generateTokenPair(Number(user.id), tenantId);

    return {
      code: 0,
      msg: 'ok',
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user_id: Number(user.id),
        tenants: tenants.map(t => ({ id: Number(t.id), name: t.name })),
      },
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新令牌' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  async refresh(@Body() body: { refresh_token: string }) {
    const tokens = await this.authService.refresh(body.refresh_token);

    return {
      code: 0,
      msg: 'ok',
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
      },
    };
  }

  @Post('logout')
  @ApiOperation({ summary: '退出登录' })
  @ApiResponse({ status: 200, description: '退出成功' })
  async logout(@Request() req: any) {
    await this.authService.logout(req.user.userId, req.user.tenantId);

    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }
}
