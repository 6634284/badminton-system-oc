// libs/modules/src/wallet/wallet.module.ts

import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Module({
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
