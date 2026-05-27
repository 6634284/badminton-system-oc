// libs/modules/src/mall/mall.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/infra/prisma';
import { RequestContext } from '@app/shared/context';

@Injectable()
export class MallService {
  constructor(private prisma: PrismaService) {}

  // ========== 分类 ==========

  async getCategories() {
    return this.prisma.productCategory.findMany({
      where: { status: 'active' },
      orderBy: { sort: 'asc' },
    });
  }

  async createCategory(data: {
    parentId?: number;
    name: string;
    sort?: number;
  }) {
    return this.prisma.productCategory.create({
      data: {
        parentId: data.parentId || 0,
        name: data.name,
        sort: data.sort || 0,
      },
    });
  }

  // ========== 商品 ==========

  async getProducts(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    categoryId?: number;
    keyword?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, categoryId, keyword, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      deletedAt: null,
    };

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (keyword) {
      where.title = { contains: keyword, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { sort: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const products = [];
    for (const item of items) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: item.categoryId },
      });

      const skus = await this.prisma.productSku.findMany({
        where: {
          productId: item.id,
          deletedAt: null,
        },
      });

      products.push({ ...item, category, skus });
    }

    return {
      list: products,
      total,
      hasMore: skip + products.length < total,
    };
  }

  async getProductById(ctx: RequestContext, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    const category = await this.prisma.productCategory.findUnique({
      where: { id: product.categoryId },
    });

    const skus = await this.prisma.productSku.findMany({
      where: {
        productId: product.id,
        deletedAt: null,
      },
    });

    return { ...product, category, skus };
  }

  async createProduct(ctx: RequestContext, data: {
    categoryId: number;
    title: string;
    coverUrl?: string;
    detailHtml?: string;
    deliveryType: string;
    skus: Array<{
      skuCode: string;
      spec: any;
      price: number;
      stock: number;
    }>;
  }) {
    const product = await this.prisma.product.create({
      data: {
        tenantId: ctx.tenantId,
        categoryId: data.categoryId,
        title: data.title,
        coverUrl: data.coverUrl,
        detailHtml: data.detailHtml,
        deliveryType: data.deliveryType,
        status: 'draft',
      },
    });

    // 创建SKU
    if (data.skus && data.skus.length > 0) {
      await this.prisma.productSku.createMany({
        data: data.skus.map((sku) => ({
          tenantId: ctx.tenantId,
          productId: product.id,
          skuCode: sku.skuCode,
          spec: sku.spec,
          price: sku.price,
          stock: sku.stock,
        })),
      });
    }

    return this.getProductById(ctx, Number(product.id));
  }

  async updateProduct(ctx: RequestContext, productId: number, data: any) {
    await this.getProductById(ctx, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  async listProduct(ctx: RequestContext, productId: number) {
    await this.getProductById(ctx, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: { status: 'on_sale' },
    });
  }

  async delistProduct(ctx: RequestContext, productId: number) {
    await this.getProductById(ctx, productId);

    return this.prisma.product.update({
      where: { id: productId },
      data: { status: 'off_sale' },
    });
  }

  // ========== 购物车 ==========

  async getCart(ctx: RequestContext) {
    const items = await this.prisma.cart.findMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  async addToCart(ctx: RequestContext, skuId: number, quantity: number) {
    const sku = await this.prisma.productSku.findUnique({
      where: { id: skuId },
    });

    if (!sku) {
      throw new NotFoundException('SKU不存在');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: sku.productId },
    });

    if (!product || product.status !== 'on_sale') {
      throw new NotFoundException('商品不存在或已下架');
    }

    if (sku.stock < quantity) {
      throw new BadRequestException('库存不足');
    }

    const existing = await this.prisma.cart.findFirst({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        skuId,
      },
    });

    if (existing) {
      return this.prisma.cart.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    }

    return this.prisma.cart.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        skuId,
        quantity,
      },
    });
  }

  async updateCartItem(ctx: RequestContext, cartId: number, quantity: number) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { quantity },
    });
  }

  async removeCartItem(ctx: RequestContext, cartId: number) {
    return this.prisma.cart.delete({
      where: { id: cartId },
    });
  }

  // ========== 订单 ==========

  async createOrder(ctx: RequestContext, data: {
    items: Array<{ skuId: number; quantity: number }>;
    couponId?: number;
    useWallet?: boolean;
    addressId?: number;
  }) {
    // 计算订单金额
    let totalAmount = 0;
    const orderItems: any[] = [];

    for (const item of data.items) {
      const sku = await this.prisma.productSku.findUnique({
        where: { id: item.skuId },
      });

      if (!sku) {
        throw new NotFoundException(`SKU ${item.skuId} 不存在`);
      }

      const product = await this.prisma.product.findUnique({
        where: { id: sku.productId },
      });

      if (!product) {
        throw new NotFoundException(`商品不存在`);
      }

      if (sku.stock - sku.lockedStock < item.quantity) {
        throw new BadRequestException(`${product.title} 库存不足`);
      }

      const itemTotal = Number(sku.price) * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: sku.productId,
        skuId: sku.id,
        skuSnapshot: {
          title: product.title,
          skuCode: sku.skuCode,
          spec: sku.spec,
          price: sku.price,
        },
        quantity: item.quantity,
        unitPrice: sku.price,
      });
    }

    // 计算优惠
    let discountAmount = 0;
    if (data.couponId) {
      // 优惠券计算逻辑
    }

    const payableAmount = totalAmount - discountAmount;
    const orderNo = this.generateOrderNo();

    // 创建订单
    const order = await this.prisma.$transaction(async (tx) => {
      // 锁定库存
      for (const item of data.items) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: { lockedStock: { increment: item.quantity } },
        });
      }

      // 创建订单
      const order = await tx.mallOrder.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          orderNo,
          totalAmount,
          discountAmount,
          payableAmount,
          couponId: data.couponId,
          status: 'pending_pay',
        },
      });

      for (const item of orderItems) {
        await tx.mallOrderItem.create({
          data: {
            orderId: order.id,
            ...item,
          },
        });
      }

      await tx.cart.deleteMany({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          skuId: { in: data.items.map((i) => i.skuId) },
        },
      });

      const items = await tx.mallOrderItem.findMany({
        where: { orderId: order.id },
      });

      return { ...order, items };
    });

    return order;
  }

  async getOrders(ctx: RequestContext, params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const { page = 1, pageSize = 20, status } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      deletedAt: null,
    };

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.mallOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.mallOrder.count({ where }),
    ]);

    const orders = [];
    for (const item of items) {
      const orderItems = await this.prisma.mallOrderItem.findMany({
        where: { orderId: item.id },
      });
      orders.push({ ...item, items: orderItems });
    }

    return {
      list: orders,
      total,
      hasMore: skip + orders.length < total,
    };
  }

  async getOrderById(ctx: RequestContext, orderNo: string) {
    const order = await this.prisma.mallOrder.findFirst({
      where: {
        orderNo,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const items = await this.prisma.mallOrderItem.findMany({
      where: { orderId: order.id },
    });

    return { ...order, items };
  }

  async cancelOrder(ctx: RequestContext, orderNo: string) {
    const order = await this.getOrderById(ctx, orderNo);

    if (order.status !== 'pending_pay') {
      throw new BadRequestException('只有待支付的订单可以取消');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: { lockedStock: { decrement: item.quantity } },
        });
      }

      return tx.mallOrder.update({
        where: { id: order.id },
        data: { status: 'canceled' },
      });
    });
  }

  async confirmOrder(ctx: RequestContext, orderNo: string) {
    const order = await this.getOrderById(ctx, orderNo);

    if (order.status !== 'delivered') {
      throw new BadRequestException('只有已发货的订单可以确认收货');
    }

    return this.prisma.mallOrder.update({
      where: { id: order.id },
      data: { status: 'completed' },
    });
  }

  async shipOrder(ctx: RequestContext, orderNo: string, data: {
    expressCompany?: string;
    expressNo?: string;
  }) {
    const order = await this.getOrderById(ctx, orderNo);

    if (order.status !== 'paid') {
      throw new BadRequestException('只有已支付的订单可以发货');
    }

    return this.prisma.mallOrder.update({
      where: { id: order.id },
      data: {
        status: 'shipped',
        deliveryType: 'express',
      },
    });
  }

  async getSkus(ctx: RequestContext, productId: number) {
    return this.prisma.productSku.findMany({
      where: {
        productId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSku(ctx: RequestContext, productId: number, data: {
    skuCode: string;
    spec: any;
    price: number;
    stock: number;
  }) {
    const existing = await this.prisma.productSku.findFirst({
      where: {
        productId,
        skuCode: data.skuCode,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('SKU编码已存在');
    }

    return this.prisma.productSku.create({
      data: {
        tenantId: ctx.tenantId,
        productId,
        skuCode: data.skuCode,
        spec: data.spec,
        price: data.price,
        stock: data.stock,
      },
    });
  }

  async updateSku(ctx: RequestContext, skuId: number, data: {
    spec?: any;
    price?: number;
    stock?: number;
  }) {
    const sku = await this.prisma.productSku.findFirst({
      where: {
        id: skuId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!sku) {
      throw new NotFoundException('SKU不存在');
    }

    return this.prisma.productSku.update({
      where: { id: skuId },
      data,
    });
  }

  async deleteSku(ctx: RequestContext, skuId: number) {
    const sku = await this.prisma.productSku.findFirst({
      where: {
        id: skuId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!sku) {
      throw new NotFoundException('SKU不存在');
    }

    await this.prisma.productSku.update({
      where: { id: skuId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async updateStock(ctx: RequestContext, skuId: number, quantity: number, type: 'add' | 'subtract') {
    const sku = await this.prisma.productSku.findFirst({
      where: {
        id: skuId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
    });

    if (!sku) {
      throw new NotFoundException('SKU不存在');
    }

    if (type === 'subtract' && sku.stock < quantity) {
      throw new BadRequestException('库存不足');
    }

    const updateData = type === 'add'
      ? { stock: { increment: quantity } }
      : { stock: { decrement: quantity } };

    return this.prisma.productSku.update({
      where: { id: skuId },
      data: updateData,
    });
  }

  async getStockLogs(ctx: RequestContext, skuId: number) {
    return [];
  }

  private generateOrderNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MALL${dateStr}${random}`;
  }
}
