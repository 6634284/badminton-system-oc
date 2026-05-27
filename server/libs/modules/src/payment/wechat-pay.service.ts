// libs/modules/src/payment/wechat-pay.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface WxPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

export interface WxPayNotifyResult {
  outTradeNo: string;
  transactionId: string;
  totalFee: number;
  resultCode: string;
  returnCode: string;
}

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly isMock: boolean;

  constructor(private configService: ConfigService) {
    this.isMock = this.configService.get('WECHAT_PAY_MOCK', 'true') === 'true';
  }

  async createUnifiedOrder(params: {
    body: string;
    outTradeNo: string;
    totalFee: number;
    notifyUrl: string;
    openid?: string;
    tradeType?: string;
  }): Promise<WxPayParams> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] WechatPay createUnifiedOrder called`, params);
      return {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: this.generateNonceStr(),
        package: `prepay_id=wx${Date.now()}`,
        signType: 'RSA',
        paySign: 'mock_pay_sign',
      };
    }

    const appId = this.configService.get('WECHAT_APP_ID');
    const mchId = this.configService.get('WECHAT_MCH_ID');
    const apiKey = this.configService.get('WECHAT_API_KEY');

    const paramsObj: Record<string, string> = {
      appid: appId,
      mch_id: mchId,
      nonce_str: this.generateNonceStr(),
      body: params.body,
      out_trade_no: params.outTradeNo,
      total_fee: String(params.totalFee),
      notify_url: params.notifyUrl,
      trade_type: params.tradeType || 'JSAPI',
    };

    if (params.openid) {
      paramsObj.openid = params.openid;
    }

    const sign = this.sign(paramsObj, apiKey);
    paramsObj.sign = sign;

    const xml = this.objectToXml(paramsObj);

    try {
      const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xml,
      });

      const result = await response.text();
      const parsed = this.xmlToObject(result);

      if (parsed.return_code === 'FAIL') {
        throw new Error(`WeChat Pay error: ${parsed.return_msg}`);
      }

      if (parsed.result_code === 'FAIL') {
        throw new Error(`WeChat Pay error: ${parsed.err_code_des}`);
      }

      return {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: this.generateNonceStr(),
        package: `prepay_id=${parsed.prepay_id}`,
        signType: 'RSA',
        paySign: this.sign({
          appId,
          timeStamp: String(Math.floor(Date.now() / 1000)),
          nonceStr: this.generateNonceStr(),
          package: `prepay_id=${parsed.prepay_id}`,
          signType: 'RSA',
        }, apiKey),
      };
    } catch (error) {
      this.logger.error('WeChat Pay createUnifiedOrder failed', error);
      throw error;
    }
  }

  async verifyNotify(xml: string): Promise<WxPayNotifyResult> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] WechatPay verifyNotify called`);
      return {
        outTradeNo: `mock_trade_${Date.now()}`,
        transactionId: `mock_txn_${Date.now()}`,
        totalFee: 100,
        resultCode: 'SUCCESS',
        returnCode: 'SUCCESS',
      };
    }

    const apiKey = this.configService.get('WECHAT_API_KEY');
    const parsed = this.xmlToObject(xml);

    const sign = this.sign(parsed, apiKey);
    if (sign !== parsed.sign) {
      throw new Error('Invalid signature');
    }

    return {
      outTradeNo: parsed.out_trade_no,
      transactionId: parsed.transaction_id,
      totalFee: parseInt(parsed.total_fee),
      resultCode: parsed.result_code,
      returnCode: parsed.return_code,
    };
  }

  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalFee: number;
    refundFee: number;
  }): Promise<{ refundId: string }> {
    if (this.isMock) {
      this.logger.warn(`[MOCK] WechatPay refund called`, params);
      return {
        refundId: `mock_refund_${Date.now()}`,
      };
    }

    const appId = this.configService.get('WECHAT_APP_ID');
    const mchId = this.configService.get('WECHAT_MCH_ID');
    const apiKey = this.configService.get('WECHAT_API_KEY');

    const paramsObj: Record<string, string> = {
      appid: appId,
      mch_id: mchId,
      nonce_str: this.generateNonceStr(),
      out_trade_no: params.outTradeNo,
      out_refund_no: params.outRefundNo,
      total_fee: String(params.totalFee),
      refund_fee: String(params.refundFee),
    };

    const sign = this.sign(paramsObj, apiKey);
    paramsObj.sign = sign;

    const xml = this.objectToXml(paramsObj);

    try {
      const response = await fetch('https://api.mch.weixin.qq.com/secapi/pay/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xml,
      });

      const result = await response.text();
      const parsed = this.xmlToObject(result);

      if (parsed.return_code === 'FAIL') {
        throw new Error(`WeChat Pay refund error: ${parsed.return_msg}`);
      }

      if (parsed.result_code === 'FAIL') {
        throw new Error(`WeChat Pay refund error: ${parsed.err_code_des}`);
      }

      return {
        refundId: parsed.refund_id,
      };
    } catch (error) {
      this.logger.error('WeChat Pay refund failed', error);
      throw error;
    }
  }

  private sign(params: Record<string, string>, apiKey: string): string {
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys
      .filter((key) => params[key] !== undefined && params[key] !== '')
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${apiKey}`;
    return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  }

  private generateNonceStr(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private objectToXml(obj: Record<string, string>): string {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(obj)) {
      xml += `<${key}><![CDATA[${value}]]></${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  private xmlToObject(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }

    return result;
  }
}
