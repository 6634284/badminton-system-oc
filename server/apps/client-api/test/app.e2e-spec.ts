// apps/client-api/test/app.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClientApiModule } from '../src/client-api.module';

describe('Client API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClientApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('/api/client/v1/auth/wx-login (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/client/v1/auth/wx-login')
        .send({ code: 'test123', tenant_id: 1 })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.access_token).toBeDefined();
          expect(res.body.data.refresh_token).toBeDefined();
        });
    });

    it('/api/client/v1/auth/sms-login (POST)', () => {
      return request(app.getHttpServer())
        .post('/api/client/v1/auth/sms-login')
        .send({ phone: '13800000000', code: 'admin123', tenantId: 1 })
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.access_token).toBeDefined();
        });
    });
  });

  describe('Activities', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/client/v1/auth/sms-login')
        .send({ phone: '13800000000', code: 'admin123', tenantId: 1 });
      token = res.body.data.access_token;
    });

    it('/api/client/v1/activities (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/client/v1/activities')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.list).toBeDefined();
        });
    });

    it('/api/client/v1/activities/:id (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/client/v1/activities/1')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.id).toBeDefined();
        });
    });
  });

  describe('Wallet', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/client/v1/auth/sms-login')
        .send({ phone: '13800000000', code: 'admin123', tenantId: 1 });
      token = res.body.data.access_token;
    });

    it('/api/client/v1/wallet (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/client/v1/wallet')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.totalBalance).toBeDefined();
        });
    });

    it('/api/client/v1/wallet/transactions (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/client/v1/wallet/transactions')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200)
        .expect((res) => {
          expect(res.body.code).toBe(0);
          expect(res.body.data.list).toBeDefined();
        });
    });
  });
});
