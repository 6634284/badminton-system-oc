// libs/modules/src/member/dto/member.dto.ts

import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MemberQueryDto {
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

  @ApiPropertyOptional({ description: '会员等级' })
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiPropertyOptional({ description: '是否拉黑' })
  @IsOptional()
  @IsBoolean()
  blacklisted?: boolean;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ description: '会员等级' })
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ImportMemberDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '等级', default: 1 })
  @IsOptional()
  @IsNumber()
  level?: number;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ImportMembersDto {
  @ApiProperty({ description: '会员列表', type: [ImportMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMemberDto)
  members!: ImportMemberDto[];
}
