// libs/modules/src/report/report.module.ts

import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReconciliationService } from './reconciliation.service';
import { ExportService } from './export.service';

@Module({
  providers: [ReportService, ReconciliationService, ExportService],
  exports: [ReportService, ReconciliationService, ExportService],
})
export class ReportModule {}
