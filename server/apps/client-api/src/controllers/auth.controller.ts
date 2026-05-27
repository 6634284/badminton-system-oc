// apps/client-api/src/controllers/auth.controller.ts

import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '@app/modules/auth';

@ApiTags('auth')
@Controller('api/client/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wx-login')
  @ApiOperation({ summary: '微信小程序登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  async wxLogin(@Body() body: { code: string; tenantId: number }) {
    const user = await this.authService.validateWxLogin(body.code, body.tenantId);
    const tokens = await this.authService.generateTokenPair(
      Number(user.id),
      body.tenantId,
    );

    return {
      code: 0,
      msg: 'ok',
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user_id: Number(user.id),
      },
    };
  }

  @Post('sms-login')
  @ApiOperation({ summary: '短信验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  async smsLogin(@Body() body: { phone: string; code: string; tenantId: number }) {
    const user = await this.authService.validateUser(body.phone, body.code);
    const tokens = await this.authService.generateTokenPair(
      Number(user.id),
      body.tenantId,
    );

    return {
      code: 0,
      msg: 'ok',
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        user_id: Number(user.id),
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
