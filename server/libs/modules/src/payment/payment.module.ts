// libs/modules/src/payment/payment.module.ts

import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { WechatPayService } from './wechat-pay.service';

@Module({
  providers: [PaymentService, WechatPayService],
  exports: [PaymentService, WechatPayService],
})
export class PaymentModule {}
