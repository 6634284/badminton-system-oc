// libs/modules/src/mall/dto/mall.dto.ts

import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: '分类ID' })
  @IsNumber()
  categoryId!: number;

  @ApiProperty({ description: '商品标题' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: '封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '详情HTML' })
  @IsOptional()
  @IsString()
  detailHtml?: string;

  @ApiProperty({ description: '配送类型', enum: ['virtual', 'self_pickup', 'express'] })
  @IsEnum(['virtual', 'self_pickup', 'express'])
  deliveryType!: string;

  @ApiPropertyOptional({ description: 'SKU列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkuDto)
  skus?: CreateSkuDto[];
}

export class CreateSkuDto {
  @ApiProperty({ description: 'SKU编码' })
  @IsString()
  skuCode!: string;

  @ApiPropertyOptional({ description: '规格' })
  @IsOptional()
  spec?: any;

  @ApiProperty({ description: '价格' })
  @IsNumber()
  price!: number;

  @ApiProperty({ description: '库存', default: 0 })
  @IsNumber()
  stock!: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: '商品标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '详情HTML' })
  @IsOptional()
  @IsString()
  detailHtml?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['draft', 'on_sale', 'off_sale'] })
  @IsOptional()
  @IsEnum(['draft', 'on_sale', 'off_sale'])
  status?: string;
}

export class CartItemDto {
  @ApiProperty({ description: 'SKU ID' })
  @IsNumber()
  skuId!: number;

  @ApiProperty({ description: '数量', default: 1 })
  @IsNumber()
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ description: '数量' })
  @IsNumber()
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: '商品列表', type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @ApiPropertyOptional({ description: '优惠券ID' })
  @IsOptional()
  @IsNumber()
  couponId?: number;

  @ApiPropertyOptional({ description: '使用钱包', default: false })
  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @ApiPropertyOptional({ description: '地址ID' })
  @IsOptional()
  @IsNumber()
  addressId?: number;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '状态', enum: ['pending_pay', 'paid', 'shipped', 'delivered', 'completed', 'canceled', 'refunding'] })
  @IsOptional()
  @IsEnum(['pending_pay', 'paid', 'shipped', 'delivered', 'completed', 'canceled', 'refunding'])
  status?: string;
}

export class ShipOrderDto {
  @ApiPropertyOptional({ description: '快递公司' })
  @IsOptional()
  @IsString()
  expressCompany?: string;

  @ApiPropertyOptional({ description: '快递单号' })
  @IsOptional()
  @IsString()
  expressNo?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ description: '分类名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '父分类ID', default: 0 })
  @IsOptional()
  @IsNumber()
  parentId?: number;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsNumber()
  sort?: number;
}
