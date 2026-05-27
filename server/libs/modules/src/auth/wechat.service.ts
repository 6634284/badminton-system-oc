// libs/modules/src/auth/wechat.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WxLoginResult {
  openid: string;
  unionid?: string;
  sessionKey: string;
}

export interface WxPhoneResult {
  phoneNumber: string;
  purePhoneNumber: string;
  countryCode: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly isMock: boolean;

  constructor(private configService: ConfigService) {
    this.isMock = this.configService.get('WECHAT_MOCK', 'true') === 'true';
  }

  async code2Session(code: string): Promise<WxLoginResult> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] Wechat code2Session called with code: ${code}`);
      return {
        openid: `mock_openid_${code}`,
        unionid: `mock_unionid_${code}`,
        sessionKey: `mock_session_key_${code}`,
      };
    }

    const appId = this.configService.get('WECHAT_APP_ID');
    const appSecret = this.configService.get('WECHAT_APP_SECRET');

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        throw new Error(`WeChat API error: ${data.errmsg}`);
      }

      return {
        openid: data.openid,
        unionid: data.unionid,
        sessionKey: data.session_key,
      };
    } catch (error) {
      this.logger.error('WeChat code2Session failed', error);
      throw error;
    }
  }

  async getPhoneNumber(code: string): Promise<WxPhoneResult> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] Wechat getPhoneNumber called with code: ${code}`);
      return {
        phoneNumber: '13800138000',
        purePhoneNumber: '13800138000',
        countryCode: '86',
      };
    }

    const appId = this.configService.get('WECHAT_APP_ID');
    const appSecret = this.configService.get('WECHAT_APP_SECRET');

    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${code}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.errcode !== 0) {
        throw new Error(`WeChat API error: ${data.errmsg}`);
      }

      return {
        phoneNumber: data.phone_info.phoneNumber,
        purePhoneNumber: data.phone_info.purePhoneNumber,
        countryCode: data.phone_info.countryCode,
      };
    } catch (error) {
      this.logger.error('WeChat getPhoneNumber failed', error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.isMock) {
      return 'mock_access_token';
    }

    const appId = this.configService.get('WECHAT_APP_ID');
    const appSecret = this.configService.get('WECHAT_APP_SECRET');

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        throw new Error(`WeChat API error: ${data.errmsg}`);
      }

      return data.access_token;
    } catch (error) {
      this.logger.error('WeChat getAccessToken failed', error);
      throw error;
    }
  }
}
