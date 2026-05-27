// libs/modules/src/tournament/tournament.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';
import { AuditService } from '@app/shared/audit';

export interface TournamentData {
  title: string;
  venueId?: number;
  startDate: string;
  endDate: string;
  formatType: 'manual' | 'round_robin' | 'knockout';
  rules?: any;
}

export interface MatchData {
  roundNo: number;
  playerAId: number;
  playerBId: number;
}

@Injectable()
export class TournamentService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getTournaments(ctx: RequestContext, params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        include: {
          _count: {
            select: {
              registrations: true,
              matches: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      list: items,
      total,
      hasMore: skip + items.length < total,
    };
  }

  async getTournamentById(ctx: RequestContext, tournamentId: number) {
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      include: {
        registrations: {
          include: {
            // user: true,
          },
        },
        matches: {
          orderBy: [{ roundNo: 'asc' }],
        },
        _count: {
          select: {
            registrations: true,
            matches: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException('赛事不存在');
    }

    return tournament;
  }

  async createTournament(ctx: RequestContext, data: TournamentData) {
    const tournament = await this.prisma.tournament.create({
      data: {
        tenantId: ctx.tenantId,
        venueId: data.venueId,
        title: data.title,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        formatType: data.formatType,
        rules: data.rules || {},
        status: 'draft',
        createdBy: ctx.userId,
      },
    });

    await this.auditService.log(ctx, {
      category: 'tournament',
      action: 'create',
      targetType: 'tournament',
      targetId: String(tournament.id),
    });

    return tournament;
  }

  async updateTournament(ctx: RequestContext, tournamentId: number, data: Partial<TournamentData>) {
    const tournament = await this.getTournamentById(ctx, tournamentId);

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        title: data.title || tournament.title,
        venueId: data.venueId || tournament.venueId,
        startDate: data.startDate ? new Date(data.startDate) : tournament.startDate,
        endDate: data.endDate ? new Date(data.endDate) : tournament.endDate,
        formatType: data.formatType || tournament.formatType,
        rules: data.rules || tournament.rules,
      },
    });
  }

  async publishTournament(ctx: RequestContext, tournamentId: number) {
    const tournament = await this.getTournamentById(ctx, tournamentId);

    if (tournament.status !== 'draft') {
      throw new BadRequestException('只有草稿状态的赛事可以发布');
    }

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'published' },
    });
  }

  async cancelTournament(ctx: RequestContext, tournamentId: number) {
    const tournament = await this.getTournamentById(ctx, tournamentId);

    if (['finished', 'canceled'].includes(tournament.status)) {
      throw new BadRequestException('该状态的赛事无法取消');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'canceled' },
      });

      await tx.tournamentRegistration.updateMany({
        where: {
          tournamentId,
          status: 'confirmed',
        },
        data: { status: 'canceled' },
      });
    });

    return { success: true };
  }

  async registerPlayer(ctx: RequestContext, tournamentId: number, userId: number, memberId: number) {
    const tournament = await this.getTournamentById(ctx, tournamentId);

    if (tournament.status !== 'published') {
      throw new BadRequestException('赛事当前不允许报名');
    }

    const existing = await this.prisma.tournamentRegistration.findFirst({
      where: {
        tournamentId,
        userId,
      },
    });

    if (existing) {
      throw new BadRequestException('已报名该赛事');
    }

    const registration = await this.prisma.tournamentRegistration.create({
      data: {
        tenantId: ctx.tenantId,
        tournamentId,
        userId,
        memberId,
        status: 'confirmed',
      },
    });

    return registration;
  }

  async createMatch(ctx: RequestContext, tournamentId: number, data: MatchData) {
    const tournament = await this.getTournamentById(ctx, tournamentId);

    const match = await this.prisma.tournamentMatch.create({
      data: {
        tenantId: ctx.tenantId,
        tournamentId,
        roundNo: data.roundNo,
        playerAId: data.playerAId,
        playerBId: data.playerBId,
        status: 'pending',
      },
    });

    return match;
  }

  async recordMatchResult(ctx: RequestContext, matchId: number, data: {
    scoreText: string;
    winnerUserId: number;
  }) {
    const match = await this.prisma.tournamentMatch.findFirst({
      where: {
        id: matchId,
        tenantId: ctx.tenantId,
      },
    });

    if (!match) {
      throw new NotFoundException('比赛不存在');
    }

    const updated = await this.prisma.tournamentMatch.update({
      where: { id: matchId },
      data: {
        scoreText: data.scoreText,
        winnerUserId: data.winnerUserId,
        status: 'finished',
        playedAt: new Date(),
      },
    });

    // 更新积分
    await this.updateRankingPoints(match.tournamentId, data.winnerUserId, match);

    return updated;
  }

  async getRanking(ctx: RequestContext, tournamentId?: number) {
    const where: any = {
      tenantId: ctx.tenantId,
    };

    if (tournamentId) {
      where.tournamentId = tournamentId;
    }

    const rankings = await this.prisma.rankingPointLog.groupBy({
      by: ['userId'],
      where,
      _sum: { pointDelta: true },
      orderBy: {
        _sum: { pointDelta: 'desc' },
      },
      take: 50,
    });

    const result = [];
    for (const ranking of rankings) {
      const user = await this.prisma.user.findUnique({
        where: { id: ranking.userId },
        select: { id: true, nickname: true, avatarUrl: true },
      });

      result.push({
        userId: Number(ranking.userId),
        nickname: user?.nickname || '未知用户',
        avatarUrl: user?.avatarUrl,
        totalPoints: ranking._sum.pointDelta || 0,
      });
    }

    return result;
  }

  private async updateRankingPoints(tournamentId: bigint, winnerUserId: bigint, match: any) {
    // 胜者加分
    await this.prisma.rankingPointLog.create({
      data: {
        tenantId: match.tenantId,
        userId: winnerUserId,
        tournamentId,
        matchId: match.id,
        pointDelta: 10,
        reason: 'match_win',
      },
    });

    // 败者减分（可选）
    const loserUserId = winnerUserId === match.playerAId ? match.playerBId : match.playerAId;
    if (loserUserId) {
      await this.prisma.rankingPointLog.create({
        data: {
          tenantId: match.tenantId,
          userId: loserUserId,
          tournamentId,
          matchId: match.id,
          pointDelta: -5,
          reason: 'match_lose',
        },
      });
    }
  }
}
