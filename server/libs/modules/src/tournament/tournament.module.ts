// libs/modules/src/tournament/tournament.module.ts

import { Module } from '@nestjs/common';
import { TournamentService } from './tournament.service';

@Module({
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
