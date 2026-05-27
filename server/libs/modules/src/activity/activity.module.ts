// libs/modules/src/activity/activity.module.ts

import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityTemplateService } from './template.service';
import { ActivityBatchService } from './batch.service';
import { ShareTrackingService } from './share-tracking.service';

@Module({
  providers: [ActivityService, ActivityTemplateService, ActivityBatchService, ShareTrackingService],
  exports: [ActivityService, ActivityTemplateService, ActivityBatchService, ShareTrackingService],
})
export class ActivityModule {}
