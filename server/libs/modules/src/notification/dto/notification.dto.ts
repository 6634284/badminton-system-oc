// libs/modules/src/notification/dto/notification.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({ description: '接收用户ID' })
  @IsNumber()
  userId!: number;

  @ApiProperty({ description: '业务类型' })
  @IsString()
  bizType!: string;

  @ApiPropertyOptional({ description: '业务ID' })
  @IsOptional()
  @IsString()
  bizId?: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  title!: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  content!: string;

  @ApiProperty({ description: '通知渠道', enum: ['in_app', 'sms', 'push', 'wechat'] })
  @IsEnum(['in_app', 'sms', 'push', 'wechat'])
  channel!: string;
}

export class SendBatchNotificationDto {
  @ApiProperty({ description: '接收用户ID列表' })
  @IsArray()
  @IsNumber({}, { each: true })
  userIds!: number[];

  @ApiProperty({ description: '业务类型' })
  @IsString()
  bizType!: string;

  @ApiPropertyOptional({ description: '业务ID' })
  @IsOptional()
  @IsString()
  bizId?: string;

  @ApiProperty({ description: '标题' })
  @IsString()
  title!: string;

  @ApiProperty({ description: '内容' })
  @IsString()
  content!: string;

  @ApiProperty({ description: '通知渠道', enum: ['in_app', 'sms', 'push', 'wechat'] })
  @IsEnum(['in_app', 'sms', 'push', 'wechat'])
  channel!: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '是否已读' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

export class MarkAsReadDto {
  @ApiProperty({ description: '通知ID' })
  @IsNumber()
  notificationId!: number;
}

export class NotificationTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '模板类型', enum: ['sms', 'wechat', 'push'] })
  @IsEnum(['sms', 'wechat', 'push'])
  type!: string;

  @ApiProperty({ description: '模板内容' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: '模板变量说明' })
  @IsOptional()
  @IsString()
  variables?: string;
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({ description: '模板名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '模板内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '模板变量说明' })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}
