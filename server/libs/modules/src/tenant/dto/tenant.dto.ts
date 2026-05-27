// libs/modules/src/tenant/dto/tenant.dto.ts

import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ description: '俱乐部名称' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '俱乐部编码' })
  @IsString()
  code!: string;

  @ApiPropertyOptional({ description: '联系人姓名' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: '联系人手机号' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '营业执照号' })
  @IsOptional()
  @IsString()
  licenseNo?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional({ description: '俱乐部名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '联系人姓名' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: '联系人手机号' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '设置' })
  @IsOptional()
  settings?: any;
}

export class TenantQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['pending', 'active', 'suspended', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'active', 'suspended', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class ApproveTenantDto {
  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class RejectTenantDto {
  @ApiProperty({ description: '拒绝原因' })
  @IsString()
  reason!: string;
}

export class SubscriptionDto {
  @ApiProperty({ description: '套餐类型', enum: ['trial', 'basic', 'pro', 'enterprise'] })
  @IsEnum(['trial', 'basic', 'pro', 'enterprise'])
  plan!: string;

  @ApiPropertyOptional({ description: '是否自动续费' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
