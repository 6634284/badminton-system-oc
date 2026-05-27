// libs/modules/src/activity/dto/activity.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateActivityDto {
  @ApiProperty({ description: '活动类型', enum: ['open_session', 'private_court', 'coach_lesson', 'tournament'] })
  @IsEnum(['open_session', 'private_court', 'coach_lesson', 'tournament'])
  type!: string;

  @ApiProperty({ description: '球馆ID' })
  @IsNumber()
  venueId!: number;

  @ApiProperty({ description: '活动标题' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: '封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiProperty({ description: '活动日期', example: '2024-01-01' })
  @IsDateString()
  playDate!: string;

  @ApiProperty({ description: '开始时间', example: '2024-01-01T19:00:00Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ description: '结束时间', example: '2024-01-01T21:00:00Z' })
  @IsDateString()
  endAt!: string;

  @ApiProperty({ description: '容量（人数）' })
  @IsNumber()
  capacity!: number;

  @ApiProperty({ description: '价格' })
  @IsNumber()
  price!: number;

  @ApiPropertyOptional({ description: '会员价格' })
  @IsOptional()
  @IsNumber()
  memberPrice?: number;

  @ApiPropertyOptional({ description: '取消政策' })
  @IsOptional()
  cancelPolicy?: {
    before_24h?: number;
    before_2h?: number;
    within_2h?: number;
  };

  @ApiPropertyOptional({ description: '报名开始时间' })
  @IsOptional()
  @IsDateString()
  registerOpenAt?: string;

  @ApiPropertyOptional({ description: '报名截止时间' })
  @IsOptional()
  @IsDateString()
  registerCloseAt?: string;

  @ApiPropertyOptional({ description: '关联排期ID列表' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  scheduleIds?: number[];
}

export class UpdateActivityDto {
  @ApiPropertyOptional({ description: '活动标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '容量（人数）' })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @ApiPropertyOptional({ description: '价格' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '会员价格' })
  @IsOptional()
  @IsNumber()
  memberPrice?: number;

  @ApiPropertyOptional({ description: '取消政策' })
  @IsOptional()
  cancelPolicy?: {
    before_24h?: number;
    before_2h?: number;
    within_2h?: number;
  };

  @ApiPropertyOptional({ description: '报名开始时间' })
  @IsOptional()
  @IsDateString()
  registerOpenAt?: string;

  @ApiPropertyOptional({ description: '报名截止时间' })
  @IsOptional()
  @IsDateString()
  registerCloseAt?: string;
}

export class RegisterActivityDto {
  @ApiPropertyOptional({ description: '额外人数（带球友）', default: 0 })
  @IsOptional()
  @IsNumber()
  extraCount?: number;

  @ApiPropertyOptional({ description: '参与者列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];

  @ApiProperty({ description: '支付方式', enum: ['wallet', 'wechat', 'alipay'] })
  @IsEnum(['wallet', 'wechat', 'alipay'])
  payMethod!: string;

  @ApiPropertyOptional({ description: '会员卡ID' })
  @IsOptional()
  @IsNumber()
  cardId?: number;

  @ApiPropertyOptional({ description: '优惠券码' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: '分享token' })
  @IsOptional()
  @IsString()
  shareToken?: string;
}

export class ParticipantDto {
  @ApiProperty({ description: '显示名称' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CancelRegistrationDto {
  @ApiPropertyOptional({ description: '取消原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CheckInDto {
  @ApiProperty({ description: '报名ID' })
  @IsNumber()
  registrationId!: number;
}

export class ActivityQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '活动类型', enum: ['open_session', 'private_court', 'coach_lesson', 'tournament'] })
  @IsOptional()
  @IsEnum(['open_session', 'private_court', 'coach_lesson', 'tournament'])
  type?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['draft', 'published', 'registering', 'full', 'ongoing', 'finished', 'settled', 'canceled'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'registering', 'full', 'ongoing', 'finished', 'settled', 'canceled'])
  status?: string;

  @ApiPropertyOptional({ description: '球馆ID' })
  @IsOptional()
  @IsNumber()
  venueId?: number;

  @ApiPropertyOptional({ description: '日期', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class RegistrationQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['paying', 'confirmed', 'canceled', 'refunded', 'no_show', 'attended'] })
  @IsOptional()
  @IsEnum(['paying', 'confirmed', 'canceled', 'refunded', 'no_show', 'attended'])
  status?: string;
}
