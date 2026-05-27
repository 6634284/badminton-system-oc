// libs/modules/src/notification/notification.module.ts

import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationTemplateService } from './template.service';

@Module({
  providers: [NotificationService, NotificationTemplateService],
  exports: [NotificationService, NotificationTemplateService],
})
export class NotificationModule {}
