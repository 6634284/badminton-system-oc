// libs/modules/src/tenant/tenant.module.ts

import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Module({
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
