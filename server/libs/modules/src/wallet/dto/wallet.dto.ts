// libs/modules/src/wallet/dto/wallet.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RechargeDto {
  @ApiProperty({ description: '充值套餐ID' })
  @IsNumber()
  packageId!: number;

  @ApiProperty({ description: '支付方式', enum: ['wechat', 'alipay'] })
  @IsEnum(['wallet', 'wechat', 'alipay'])
  payChannel!: string;
}

export class AdjustBalanceDto {
  @ApiProperty({ description: '调整类型', enum: ['increase', 'decrease'] })
  @IsEnum(['increase', 'decrease'])
  type!: string;

  @ApiProperty({ description: '调整金额' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: '子账户', enum: ['cash', 'gift'] })
  @IsEnum(['cash', 'gift'])
  subAccount!: string;

  @ApiProperty({ description: '备注' })
  @IsString()
  remark!: string;
}

export class WalletQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '业务类型' })
  @IsOptional()
  @IsString()
  bizType?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateRechargePackageDto {
  @ApiProperty({ description: '套餐名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '充值金额' })
  @IsNumber()
  chargeAmount!: number;

  @ApiProperty({ description: '赠送金额', default: 0 })
  @IsNumber()
  giftAmount!: number;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsNumber()
  sort?: number;
}

export class UpdateRechargePackageDto {
  @ApiPropertyOptional({ description: '套餐名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '充值金额' })
  @IsOptional()
  @IsNumber()
  chargeAmount?: number;

  @ApiPropertyOptional({ description: '赠送金额' })
  @IsOptional()
  @IsNumber()
  giftAmount?: number;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}

export class CreateRefundDto {
  @ApiProperty({ description: '支付单ID' })
  @IsNumber()
  paymentId!: number;

  @ApiProperty({ description: '退款金额' })
  @IsNumber()
  refundAmount!: number;

  @ApiProperty({ description: '退款原因' })
  @IsString()
  reason!: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '业务类型' })
  @IsOptional()
  @IsString()
  bizType?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class RefundQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsString()
  status?: string;
}
