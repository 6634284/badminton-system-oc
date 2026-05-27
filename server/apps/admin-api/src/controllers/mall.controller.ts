// apps/admin-api/src/controllers/mall.controller.ts

import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { MallService } from '@app/modules/mall';

@ApiTags('mall')
@Controller('api/admin/v1/mall')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class MallController {
  constructor(private mallService: MallService) {}

  @Get('products')
  @ApiOperation({ summary: '获取商品列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getProducts(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category_id') categoryId?: number,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.mallService.getProducts(req.ctx, {
      page,
      pageSize: limit,
      categoryId,
      keyword,
      status,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post('products')
  @ApiOperation({ summary: '创建商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async createProduct(
    @Request() req: any,
    @Body() body: {
      category_id: number;
      title: string;
      cover_url?: string;
      detail_html?: string;
      delivery_type: string;
      skus: Array<{
        sku_code: string;
        spec: any;
        price: number;
        stock: number;
      }>;
    },
  ) {
    const product = await this.mallService.createProduct(req.ctx, {
      categoryId: body.category_id,
      title: body.title,
      coverUrl: body.cover_url,
      detailHtml: body.detail_html,
      deliveryType: body.delivery_type,
      skus: body.skus?.map((sku: any) => ({
        skuCode: sku.sku_code,
        spec: sku.spec,
        price: sku.price,
        stock: sku.stock,
      })),
    });

    return {
      code: 0,
      msg: 'ok',
      data: product,
    };
  }

  @Patch('products/:id')
  @ApiOperation({ summary: '更新商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateProduct(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: any,
  ) {
    const product = await this.mallService.updateProduct(req.ctx, id, body);

    return {
      code: 0,
      msg: 'ok',
      data: product,
    };
  }

  @Post('products/:id/list')
  @ApiOperation({ summary: '上架商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async listProduct(@Request() req: any, @Param('id') id: number) {
    const product = await this.mallService.listProduct(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: product,
    };
  }

  @Post('products/:id/delist')
  @ApiOperation({ summary: '下架商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async delistProduct(@Request() req: any, @Param('id') id: number) {
    const product = await this.mallService.delistProduct(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: product,
    };
  }

  @Get('orders')
  @ApiOperation({ summary: '获取订单列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getOrders(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const result = await this.mallService.getOrders(req.ctx, {
      page,
      pageSize: limit,
      status,
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Post('orders/:no/ship')
  @ApiOperation({ summary: '发货' })
  @ApiResponse({ status: 200, description: '成功' })
  async shipOrder(
    @Request() req: any,
    @Param('no') orderNo: string,
    @Body() body: { express_company?: string; express_no?: string },
  ) {
    const order = await this.mallService.shipOrder(req.ctx, orderNo, {
      expressCompany: body.express_company,
      expressNo: body.express_no,
    });

    return {
      code: 0,
      msg: 'ok',
      data: order,
    };
  }

  @Get('categories')
  @ApiOperation({ summary: '获取商品分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCategories() {
    const categories = await this.mallService.getCategories();

    return {
      code: 0,
      msg: 'ok',
      data: categories,
    };
  }

  @Post('categories')
  @ApiOperation({ summary: '创建商品分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async createCategory(
    @Body() body: { name: string; parent_id?: number; sort?: number },
  ) {
    const category = await this.mallService.createCategory({
      name: body.name,
      parentId: body.parent_id,
      sort: body.sort,
    });

    return {
      code: 0,
      msg: 'ok',
      data: category,
    };
  }
}
