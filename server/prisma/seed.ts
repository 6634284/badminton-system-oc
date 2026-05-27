// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create platform admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      phone: '13800000000',
      phoneHash: '13800000000',
      nickname: '平台管理员',
      passwordHash: adminPassword,
      status: 'active',
    },
  });
  console.log('Created admin user:', adminUser.phone);

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      code: 'demo_club',
      name: '示例羽毛球俱乐部',
      contactName: '张三',
      contactPhone: '13800000001',
      status: 'active',
      plan: 'trial',
      planExpiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Created tenant:', tenant.name);

  // Create roles for tenant
  const ownerRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      code: 'owner',
      name: '主理人',
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      code: 'admin',
      name: '管理员',
      isSystem: true,
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      code: 'staff',
      name: '员工',
      isSystem: true,
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      code: 'member',
      name: '会员',
      isSystem: true,
    },
  });

  console.log('Created roles for tenant');

  // Add admin as tenant owner
  await prisma.tenantStaff.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      roleId: ownerRole.id,
      isOwner: true,
    },
  });
  console.log('Added admin as tenant owner');

  // Create demo member user
  const memberPassword = await bcrypt.hash('member123', 10);
  const memberUser = await prisma.user.create({
    data: {
      phone: '13800000002',
      phoneHash: '13800000002',
      nickname: '羽毛球爱好者',
      passwordHash: memberPassword,
      status: 'active',
    },
  });
  console.log('Created member user:', memberUser.phone);

  // Add member to tenant
  await prisma.tenantStaff.create({
    data: {
      tenantId: tenant.id,
      userId: memberUser.id,
      roleId: memberRole.id,
    },
  });

  // Create member profile
  const member = await prisma.member.create({
    data: {
      tenantId: tenant.id,
      userId: memberUser.id,
      memberNo: 'M000001',
      level: 1,
      points: 0,
      totalSpentAmount: 0,
      source: 'direct',
      tags: [],
    },
  });
  console.log('Created member profile:', member.memberNo);

  // Create wallet for member
  await prisma.wallet.create({
    data: {
      tenantId: tenant.id,
      userId: memberUser.id,
      cashBalance: 100,
      giftBalance: 10,
      frozenBalance: 0,
    },
  });
  console.log('Created wallet for member');

  // Create demo venue
  const venue = await prisma.venue.create({
    data: {
      tenantId: tenant.id,
      name: '示例球馆',
      city: '北京',
      district: '朝阳区',
      address: '示例地址123号',
      latitude: 39.9042,
      longitude: 116.4074,
      status: 'active',
    },
  });
  console.log('Created venue:', venue.name);

  // Create courts
  const courts = [];
  for (let i = 1; i <= 4; i++) {
    const court = await prisma.court.create({
      data: {
        tenantId: tenant.id,
        venueId: venue.id,
        code: `#${i}`,
        type: 'standard',
        basePrice: 60,
        status: 'active',
      },
    });
    courts.push(court);
  }
  console.log('Created courts:', courts.length);

  // Create demo activity
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const endTime = new Date(tomorrow);
  endTime.setHours(21, 0, 0, 0);

  const activity = await prisma.activity.create({
    data: {
      tenantId: tenant.id,
      venueId: venue.id,
      type: 'open_session',
      title: '周三晚混打',
      playDate: tomorrow,
      startAt: tomorrow,
      endAt: endTime,
      capacity: 16,
      price: 35,
      memberPrice: 30,
      cancelPolicy: {
        before_24h: 1.0,
        before_2h: 0.5,
        within_2h: 0,
      },
      status: 'registering',
      createdBy: adminUser.id,
    },
  });
  console.log('Created activity:', activity.title);

  // Create recharge packages
  await prisma.rechargePackage.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: '充100送10',
        chargeAmount: 100,
        giftAmount: 10,
        sort: 1,
        status: 'active',
      },
      {
        tenantId: tenant.id,
        name: '充500送80',
        chargeAmount: 500,
        giftAmount: 80,
        sort: 2,
        status: 'active',
      },
      {
        tenantId: tenant.id,
        name: '充1000送200',
        chargeAmount: 1000,
        giftAmount: 200,
        sort: 3,
        status: 'active',
      },
    ],
  });
  console.log('Created recharge packages');

  console.log('Seeding completed!');
  console.log('');
  console.log('Test accounts:');
  console.log('  Admin: 13800000000 / admin123');
  console.log('  Member: 13800000002 / member123');
  console.log('');
  console.log('Demo tenant code: demo_club');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
