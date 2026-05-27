// apps/admin-api/src/controllers/venue.controller.ts

import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { VenueService } from '@app/modules/venue';

@ApiTags('venues')
@Controller('api/admin/v1/venues')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class VenueController {
  constructor(private venueService: VenueService) {}

  @Get()
  @ApiOperation({ summary: '获取球馆列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getVenues(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.venueService.getVenues(req.ctx, {
      page: page || 1,
      pageSize: limit || 20,
      keyword,
      status,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post()
  @ApiOperation({ summary: '创建球馆' })
  @ApiResponse({ status: 200, description: '成功' })
  async createVenue(
    @Request() req: any,
    @Body() body: {
      name: string;
      city?: string;
      district?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      open_rules?: any;
    },
  ) {
    const venue = await this.venueService.createVenue(req.ctx, {
      name: body.name,
      city: body.city,
      district: body.district,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      openRules: body.open_rules,
    });

    return {
      code: 0,
      msg: 'ok',
      data: venue,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新球馆' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateVenue(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: any,
  ) {
    const venue = await this.venueService.updateVenue(req.ctx, id, body);

    return {
      code: 0,
      msg: 'ok',
      data: venue,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除球馆' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteVenue(@Request() req: any, @Param('id') id: number) {
    await this.venueService.deleteVenue(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }

  @Get(':id/courts')
  @ApiOperation({ summary: '获取场地列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCourts(@Request() req: any, @Param('id') id: number) {
    const courts = await this.venueService.getCourts(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: courts,
    };
  }

  @Post(':id/courts')
  @ApiOperation({ summary: '创建场地' })
  @ApiResponse({ status: 200, description: '成功' })
  async createCourt(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { code: string; type?: string; base_price?: number },
  ) {
    const court = await this.venueService.createCourt(req.ctx, id, {
      code: body.code,
      type: body.type,
      basePrice: body.base_price,
    });

    return {
      code: 0,
      msg: 'ok',
      data: court,
    };
  }

  @Get(':id/schedules')
  @ApiOperation({ summary: '获取排期' })
  @ApiResponse({ status: 200, description: '成功' })
  async getSchedules(
    @Request() req: any,
    @Param('id') id: number,
    @Query('date') date: string,
  ) {
    const schedules = await this.venueService.getSchedules(req.ctx, id, date);

    return {
      code: 0,
      msg: 'ok',
      data: schedules,
    };
  }

  @Post(':id/schedules/generate')
  @ApiOperation({ summary: '生成排期' })
  @ApiResponse({ status: 200, description: '成功' })
  async generateSchedules(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { days?: number; start_hour?: number; end_hour?: number; slot_minutes?: number },
  ) {
    const result = await this.venueService.generateSchedules(req.ctx, id, {
      days: body.days,
      startHour: body.start_hour,
      endHour: body.end_hour,
      slotMinutes: body.slot_minutes,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Patch('schedules/:id')
  @ApiOperation({ summary: '更新排期' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateSchedule(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { price?: number; status?: string },
  ) {
    const schedule = await this.venueService.updateSchedule(req.ctx, id, body);

    return {
      code: 0,
      msg: 'ok',
      data: schedule,
    };
  }
}
