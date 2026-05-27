// libs/modules/src/coupon/dto/coupon.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ description: '优惠券名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '类型', enum: ['discount', 'cash', 'condition'] })
  @IsEnum(['discount', 'cash', 'condition'])
  type!: string;

  @ApiProperty({ description: '优惠值' })
  @IsNumber()
  discountValue!: number;

  @ApiProperty({ description: '适用范围', enum: ['all', 'activity', 'mall', 'category'] })
  @IsEnum(['all', 'activity', 'mall', 'category'])
  applyScope!: string;

  @ApiPropertyOptional({ description: '适用目标ID' })
  @IsOptional()
  @IsNumber()
  applyTargetId?: number;

  @ApiProperty({ description: '库存' })
  @IsNumber()
  stock!: number;

  @ApiProperty({ description: '每人限领', default: 1 })
  @IsNumber()
  perUserLimit!: number;

  @ApiProperty({ description: '有效期类型', enum: [1, 2] })
  @IsEnum([1, 2])
  validType!: number;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ description: '有效天数' })
  @IsOptional()
  @IsNumber()
  validDays?: number;
}

export class UpdateCouponDto {
  @ApiPropertyOptional({ description: '优惠券名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '优惠值' })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ description: '库存' })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

export class CouponQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

export class IssueCouponDto {
  @ApiProperty({ description: '用户ID列表' })
  @IsArray()
  @IsNumber({}, { each: true })
  userIds!: number[];
}

export class UserCouponQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['unused', 'locked', 'used', 'expired'] })
  @IsOptional()
  @IsEnum(['unused', 'locked', 'used', 'expired'])
  status?: string;
}
