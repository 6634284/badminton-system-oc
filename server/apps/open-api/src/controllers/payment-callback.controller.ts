// apps/open-api/src/controllers/payment-callback.controller.ts

import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from '@app/modules/payment';

@ApiTags('payments')
@Controller('api/open/v1/payments')
export class PaymentCallbackController {
  constructor(private paymentService: PaymentService) {}

  @Post('wechat/notify')
  @ApiOperation({ summary: '微信支付回调' })
  async wechatNotify(@Body() body: any, @Headers() headers: any) {
    // 简化处理，实际需要验签
    console.log('Wechat payment callback:', body);

    const result = await this.paymentService.handlePaymentCallback({
      outTradeNo: body.out_trade_no || body.outTradeNo,
      status: 'paid',
      paidAt: new Date(),
      notifyPayload: body,
    });

    return {
      code: 'SUCCESS',
      message: '成功',
    };
  }

  @Post('alipay/notify')
  @ApiOperation({ summary: '支付宝回调' })
  async alipayNotify(@Body() body: any) {
    // 简化处理，实际需要验签
    console.log('Alipay payment callback:', body);

    const result = await this.paymentService.handlePaymentCallback({
      outTradeNo: body.out_trade_no,
      status: 'paid',
      paidAt: new Date(),
      notifyPayload: body,
    });

    return 'success';
  }

  @Post('wechat/refund/notify')
  @ApiOperation({ summary: '微信退款回调' })
  async wechatRefundNotify(@Body() body: any) {
    // 简化处理，实际需要验签
    console.log('Wechat refund callback:', body);

    const result = await this.paymentService.handleRefundCallback({
      refundNo: body.refund_no || body.refundNo,
      status: 'success',
      refundedAt: new Date(),
    });

    return {
      code: 'SUCCESS',
      message: '成功',
    };
  }
}
