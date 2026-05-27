// libs/modules/src/coach/coach.module.ts

import { Module } from '@nestjs/common';
import { CoachService } from './coach.service';

@Module({
  providers: [CoachService],
  exports: [CoachService],
})
export class CoachModule {}
