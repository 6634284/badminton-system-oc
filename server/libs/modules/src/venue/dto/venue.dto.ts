// libs/modules/src/venue/dto/venue.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVenueDto {
  @ApiProperty({ description: '球馆名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '区域' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '营业规则' })
  @IsOptional()
  openRules?: any;
}

export class UpdateVenueDto {
  @ApiPropertyOptional({ description: '球馆名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '城市' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '区域' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '纬度' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: '营业规则' })
  @IsOptional()
  openRules?: any;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

export class CreateCourtDto {
  @ApiProperty({ description: '场地编号' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: '场地类型', enum: ['standard', 'training'], default: 'standard' })
  @IsOptional()
  @IsEnum(['standard', 'training'])
  type?: string;

  @ApiPropertyOptional({ description: '基础价格', default: 0 })
  @IsOptional()
  @IsNumber()
  basePrice?: number;
}

export class UpdateCourtDto {
  @ApiPropertyOptional({ description: '场地编号' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '场地类型', enum: ['standard', 'training'] })
  @IsOptional()
  @IsEnum(['standard', 'training'])
  type?: string;

  @ApiPropertyOptional({ description: '基础价格' })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

export class GenerateSchedulesDto {
  @ApiPropertyOptional({ description: '生成天数', default: 14 })
  @IsOptional()
  @IsNumber()
  days?: number;

  @ApiPropertyOptional({ description: '开始小时', default: 9 })
  @IsOptional()
  @IsNumber()
  startHour?: number;

  @ApiPropertyOptional({ description: '结束小时', default: 21 })
  @IsOptional()
  @IsNumber()
  endHour?: number;

  @ApiPropertyOptional({ description: '时段长度（分钟）', default: 60 })
  @IsOptional()
  @IsNumber()
  slotMinutes?: number;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: '价格' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['available', 'held', 'booked', 'maintenance', 'closed'] })
  @IsOptional()
  @IsEnum(['available', 'held', 'booked', 'maintenance', 'closed'])
  status?: string;
}

export class BatchUpdateScheduleDto {
  @ApiProperty({ description: '排期ID列表' })
  @IsArray()
  @IsNumber({}, { each: true })
  scheduleIds!: number[];

  @ApiPropertyOptional({ description: '价格' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['available', 'held', 'booked', 'maintenance', 'closed'] })
  @IsOptional()
  @IsEnum(['available', 'held', 'booked', 'maintenance', 'closed'])
  status?: string;
}

export class VenueQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

export class ScheduleQueryDto {
  @ApiProperty({ description: '日期', example: '2024-01-01' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ description: '场地ID' })
  @IsOptional()
  @IsNumber()
  courtId?: number;
}
