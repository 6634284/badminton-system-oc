// apps/client-api/test/wallet.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClientApiModule } from '../src/client-api.module';

describe('Wallet (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClientApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/client/v1/auth/sms-login')
      .send({ phone: '13800000000', code: 'admin123', tenantId: 1 });
    token = loginResponse.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/client/v1/wallet', () => {
    it('should return wallet balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/client/v1/wallet')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.cashBalance).toBeDefined();
      expect(response.body.data.giftBalance).toBeDefined();
      expect(response.body.data.totalBalance).toBeDefined();
    });
  });

  describe('GET /api/client/v1/wallet/transactions', () => {
    it('should return wallet transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/client/v1/wallet/transactions')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeDefined();
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });
  });

  describe('GET /api/client/v1/wallet/recharge-packages', () => {
    it('should return recharge packages', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/client/v1/wallet/recharge-packages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data).toBeDefined();
    });
  });
});
