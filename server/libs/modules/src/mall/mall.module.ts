// libs/modules/src/mall/mall.module.ts

import { Module } from '@nestjs/common';
import { MallService } from './mall.service';

@Module({
  providers: [MallService],
  exports: [MallService],
})
export class MallModule {}
