// libs/modules/src/venue/venue.module.ts

import { Module } from '@nestjs/common';
import { VenueService } from './venue.service';

@Module({
  providers: [VenueService],
  exports: [VenueService],
})
export class VenueModule {}
