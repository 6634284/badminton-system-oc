// apps/client-api/src/controllers/mall.controller.ts

import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { MallService } from '@app/modules/mall';

@ApiTags('mall')
@Controller('api/client/v1/mall')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class MallController {
  constructor(private mallService: MallService) {}

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

  @Get('products')
  @ApiOperation({ summary: '获取商品列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getProducts(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category_id') categoryId?: number,
    @Query('keyword') keyword?: string,
  ) {
    const result = await this.mallService.getProducts(req.ctx, {
      page,
      pageSize: limit,
      categoryId,
      keyword,
      status: 'on_sale',
    });

    return {
      code: 0,
      msg: 'ok',
      data: result,
    };
  }

  @Get('products/:id')
  @ApiOperation({ summary: '获取商品详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getProduct(@Request() req: any, @Param('id') id: number) {
    const product = await this.mallService.getProductById(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: product,
    };
  }

  @Get('cart')
  @ApiOperation({ summary: '获取购物车' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCart(@Request() req: any) {
    const items = await this.mallService.getCart(req.ctx);

    return {
      code: 0,
      msg: 'ok',
      data: items,
    };
  }

  @Post('cart/items')
  @ApiOperation({ summary: '添加购物车' })
  @ApiResponse({ status: 200, description: '成功' })
  async addToCart(
    @Request() req: any,
    @Body() body: { sku_id: number; quantity: number },
  ) {
    const item = await this.mallService.addToCart(req.ctx, body.sku_id, body.quantity);

    return {
      code: 0,
      msg: 'ok',
      data: item,
    };
  }

  @Patch('cart/items/:id')
  @ApiOperation({ summary: '更新购物车' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateCartItem(
    @Request() req: any,
    @Param('id') id: number,
    @Body() body: { quantity: number },
  ) {
    const item = await this.mallService.updateCartItem(req.ctx, id, body.quantity);

    return {
      code: 0,
      msg: 'ok',
      data: item,
    };
  }

  @Delete('cart/items/:id')
  @ApiOperation({ summary: '删除购物车' })
  @ApiResponse({ status: 200, description: '成功' })
  async removeCartItem(@Request() req: any, @Param('id') id: number) {
    await this.mallService.removeCartItem(req.ctx, id);

    return {
      code: 0,
      msg: 'ok',
      data: null,
    };
  }

  @Post('orders')
  @ApiOperation({ summary: '创建订单' })
  @ApiResponse({ status: 200, description: '成功' })
  async createOrder(
    @Request() req: any,
    @Body() body: {
      items: Array<{ sku_id: number; quantity: number }>;
      coupon_id?: number;
      use_wallet?: boolean;
      address_id?: number;
    },
  ) {
    const order = await this.mallService.createOrder(req.ctx, {
      items: body.items.map((item) => ({
        skuId: item.sku_id,
        quantity: item.quantity,
      })),
      couponId: body.coupon_id,
      useWallet: body.use_wallet,
      addressId: body.address_id,
    });

    return {
      code: 0,
      msg: 'ok',
      data: order,
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

  @Get('orders/:no')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getOrder(@Request() req: any, @Param('no') orderNo: string) {
    const order = await this.mallService.getOrderById(req.ctx, orderNo);

    return {
      code: 0,
      msg: 'ok',
      data: order,
    };
  }

  @Post('orders/:no/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiResponse({ status: 200, description: '成功' })
  async cancelOrder(@Request() req: any, @Param('no') orderNo: string) {
    const order = await this.mallService.cancelOrder(req.ctx, orderNo);

    return {
      code: 0,
      msg: 'ok',
      data: order,
    };
  }

  @Post('orders/:no/confirm')
  @ApiOperation({ summary: '确认收货' })
  @ApiResponse({ status: 200, description: '成功' })
  async confirmOrder(@Request() req: any, @Param('no') orderNo: string) {
    const order = await this.mallService.confirmOrder(req.ctx, orderNo);

    return {
      code: 0,
      msg: 'ok',
      data: order,
    };
  }
}
